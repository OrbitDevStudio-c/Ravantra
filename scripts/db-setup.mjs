/**
 * Neon / Postgres setup for RAVANTRA.
 *
 *   npm run db:setup            apply any new migrations (+ seed on first run) and sync the admin account
 *   npm run db:setup -- --admin-only   only create/update the admin account
 *
 * - Recreates the small slice of Supabase the migrations expect: the anon /
 *   authenticated / service_role roles, auth.uid(), auth.users, auth.sessions.
 * - Applies supabase/migrations in order, tracked in ops.schema_migrations,
 *   replacing the Supabase-Storage migration with a Postgres `media` table.
 * - Seeds demo content once, then disables every demo login (demo accounts keep
 *   their history but cannot sign in).
 * - Creates / updates the super admin from ADMIN_EMAIL + ADMIN_PASSWORD
 *   (bcrypt-hashed in the database; the password never appears in code).
 *
 * Reads DATABASE_URL (or Database_Storage) from the environment or .env / .env.local.
 * Migrations, seed and admin each run in their own transaction (Postgres can't use a
 * newly added enum value in the transaction that added it); each step is tracked, so a
 * failed step leaves earlier steps intact and is simply retried on the next run.
 */
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { Pool, neonConfig } from "@neondatabase/serverless";
import ws from "ws";

neonConfig.webSocketConstructor = ws;
const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnv() {
  const env = { ...process.env };
  for (const f of [".env", ".env.local"]) {
    const p = join(root, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, "utf8").split(/\r?\n/)) {
      const m = /^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/.exec(line);
      if (!m || line.trim().startsWith("#")) continue;
      if (env[m[1]] === undefined || f === ".env.local") env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
  return env;
}

const env = loadEnv();
const url = env.DATABASE_URL || env.Database_Storage;
if (!url) {
  console.error("✗ DATABASE_URL (or Database_Storage) is not set.");
  process.exit(1);
}
const adminOnly = process.argv.includes("--admin-only");
const log = (m) => console.log(m);

const BOOTSTRAP = `
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin; end if;
end $$;
-- the connecting owner must be able to SET ROLE to these for RLS-scoped requests
grant anon, authenticated, service_role to current_user;

create schema if not exists extensions;
create extension if not exists pgcrypto schema extensions;
create extension if not exists btree_gist schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;

create schema if not exists auth;
create table if not exists auth.users (
  instance_id uuid, id uuid primary key, aud text, role text, email text, encrypted_password text,
  email_confirmed_at timestamptz, raw_app_meta_data jsonb, raw_user_meta_data jsonb,
  created_at timestamptz default now(), updated_at timestamptz default now(), confirmation_token text, email_change text,
  email_change_token_new text, recovery_token text, recovery_sent_at timestamptz, last_sign_in_at timestamptz
);
create unique index if not exists users_email_lower_idx on auth.users (lower(email));
create table if not exists auth.identities (
  id uuid, user_id uuid references auth.users on delete cascade, provider_id text, identity_data jsonb,
  provider text, last_sign_in_at timestamptz, created_at timestamptz, updated_at timestamptz,
  primary key (provider_id, provider)
);
create table if not exists auth.sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  token_hash text not null unique,
  user_agent text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists sessions_user_idx on auth.sessions (user_id);
create or replace function auth.uid() returns uuid language sql stable as
  $f$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $f$;
create or replace function auth.role() returns text language sql stable as
  $f$ select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''), 'anon') $f$;
-- policies/functions may call auth.uid(); the tables themselves stay private
grant usage on schema auth to anon, authenticated, service_role;
revoke all on all tables in schema auth from anon, authenticated, service_role;
grant execute on function auth.uid(), auth.role() to anon, authenticated, service_role;

create schema if not exists ops;
create table if not exists ops.schema_migrations (name text primary key, applied_at timestamptz not null default now());
`;

/** Replaces the Supabase Storage migration: uploads live in Postgres, served by /media/[...path]. */
const MEDIA = `
create table if not exists public.media (
  id uuid primary key default gen_random_uuid(),
  path text not null unique,
  content_type text not null check (content_type in ('image/jpeg','image/png','image/webp','image/avif')),
  bytes bytea not null check (octet_length(bytes) <= 5 * 1024 * 1024),
  owner_id uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
alter table public.media enable row level security;
revoke all on public.media from anon, authenticated;

create or replace function public.media_put(p_path text, p_content_type text, p_base64 text, p_owner uuid)
returns text language sql security definer set search_path = public, pg_temp as
$f$ insert into public.media (path, content_type, bytes, owner_id) values (p_path, p_content_type, decode(p_base64, 'base64'), p_owner) returning path $f$;
revoke all on function public.media_put(text, text, text, uuid) from public, anon, authenticated;
`;

const STORAGE_MIGRATION = "20261105000005_storage.sql";

const pool = new Pool({ connectionString: url });
const c = await pool.connect();
try {
  await c.query("begin");
  await c.query(BOOTSTRAP);
  log("✓ auth / roles bootstrap");

  if (!adminOnly) {
    const applied = new Set((await c.query("select name from ops.schema_migrations")).rows.map((r) => r.name));
    const dir = join(root, "supabase", "migrations");
    for (const f of readdirSync(dir).filter((x) => x.endsWith(".sql")).sort()) {
      if (applied.has(f)) continue;
      // Supabase Storage → Postgres media table (needs public.profiles, so runs in place of the storage migration)
      await c.query(f === STORAGE_MIGRATION ? MEDIA : readFileSync(join(dir, f), "utf8"));
      await c.query("insert into ops.schema_migrations (name) values ($1)", [f]);
      log(`✓ migration ${f}${f === STORAGE_MIGRATION ? " (→ Postgres media table)" : ""}`);
    }
    await c.query("commit");

    if (!applied.has("seed.sql")) {
      await c.query("begin");
      await c.query(readFileSync(join(root, "supabase", "seed.sql"), "utf8"));
      await c.query("insert into ops.schema_migrations (name) values ('seed.sql')");
      // Demo accounts keep their orders/reviews history but can never sign in.
      const locked = await c.query("update auth.users set encrypted_password = null where email like '%@ravantra.test'");
      log(`✓ seed.sql (demo content) · ${locked.rowCount} demo logins disabled`);
      await c.query("commit");
    }
    await c.query("begin");
  }

  const email = (env.ADMIN_EMAIL || "").trim().toLowerCase();
  const password = env.ADMIN_PASSWORD || "";
  if (email && password) {
    if (password.length < 8) throw new Error("ADMIN_PASSWORD must be at least 8 characters");
    const existing = await c.query("select id from auth.users where lower(email) = $1", [email]);
    let id = existing.rows[0]?.id;
    if (id) {
      await c.query("update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf', 10)), updated_at = now() where id = $1", [id, password]);
    } else {
      id = (
        await c.query(
          `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
           values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
                   extensions.crypt($2, extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}', '{"full_name":"RAVANTRA Admin"}', now(), now())
           returning id`,
          [email, password],
        )
      ).rows[0].id;
    }
    // profile is created by the on_auth_user_created trigger; make sure it exists either way
    await c.query("insert into public.profiles (id, email, full_name) values ($1, $2, 'RAVANTRA Admin') on conflict (id) do nothing", [id, email]);
    await c.query("insert into public.user_roles (user_id, role_id) select $1, id from public.roles where key = 'super_admin' on conflict do nothing", [id]);
    log(`✓ super admin ready: ${email}`);
  } else {
    log("• ADMIN_EMAIL / ADMIN_PASSWORD not set — skipped admin account");
  }

  await c.query("commit");
  log("\nDatabase is ready.");
} catch (e) {
  await c.query("rollback").catch(() => {});
  console.error(`\n✗ Setup failed — this step was rolled back; earlier steps are kept, re-run to continue.\n  ${e.message}`);
  process.exitCode = 1;
} finally {
  c.release();
  await pool.end();
}
