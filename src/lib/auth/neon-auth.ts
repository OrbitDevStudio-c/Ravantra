/* eslint-disable @typescript-eslint/no-explicit-any -- untyped rows, matching supabase-js without generated types (callers narrow) */
import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { withContext } from "@/lib/db/pool";

/**
 * First-party authentication on Postgres (replaces Supabase Auth).
 *
 * - Passwords: bcrypt via pgcrypto (`crypt(pw, gen_salt('bf', 10))`), never stored in plain text.
 * - Sessions: 256-bit random token in an httpOnly cookie; only its SHA-256 hash is stored.
 * - Password reset: single-use token (hash stored) that expires after one hour.
 *
 * The method names and `{ data, error }` shapes mirror supabase-js so existing callers keep working.
 */

export interface AuthUser {
  id: string;
  email: string | null;
  user_metadata: Record<string, any>;
  app_metadata: Record<string, any>;
  created_at: string;
}
export interface AuthError {
  message: string;
  status?: number;
}

export const SESSION_COOKIE = "rv_session";
const SESSION_DAYS = 30;
const RESET_MINUTES = 60;

const sha256 = (s: string) => createHash("sha256").update(s).digest("hex");
const token = () => randomBytes(32).toString("base64url");
const svc = <T,>(fn: Parameters<typeof withContext<T>>[1]) => withContext<T>({ role: "service" }, fn);

type UserRow = { id: string; email: string | null; raw_user_meta_data: Record<string, any> | null; raw_app_meta_data: Record<string, any> | null; created_at: string };
const toUser = (r: UserRow): AuthUser => ({
  id: r.id,
  email: r.email,
  user_metadata: r.raw_user_meta_data ?? {},
  app_metadata: r.raw_app_meta_data ?? {},
  created_at: new Date(r.created_at).toISOString(),
});

async function setSessionCookie(userId: string, userAgent?: string | null) {
  const t = token();
  await svc((c) =>
    c.query(
      `insert into auth.sessions (user_id, token_hash, expires_at, user_agent) values ($1, $2, now() + make_interval(days => ${SESSION_DAYS}), $3)`,
      [userId, sha256(t), userAgent?.slice(0, 300) ?? null],
    ),
  );
  const jar = await cookies();
  jar.set(SESSION_COOKIE, t, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
  return t;
}

/** Current user from the session cookie (cached per request). Read-only — safe in Server Components. */
export const currentUser = cache(async (): Promise<AuthUser | null> => {
  const jar = await cookies();
  const t = jar.get(SESSION_COOKIE)?.value;
  if (!t || t.length < 20) return null;
  const rows = await svc(async (c) =>
    (
      await c.query<UserRow>(
        `select u.id, u.email, u.raw_user_meta_data, u.raw_app_meta_data, u.created_at
           from auth.sessions s join auth.users u on u.id = s.user_id
          where s.token_hash = $1 and s.expires_at > now()`,
        [sha256(t)],
      )
    ).rows,
  );
  return rows[0] ? toUser(rows[0]) : null;
});

export const auth = {
  async getUser(): Promise<{ data: { user: AuthUser | null }; error: AuthError | null }> {
    try {
      return { data: { user: await currentUser() }, error: null };
    } catch (e) {
      return { data: { user: null }, error: { message: (e as Error).message } };
    }
  },

  async signInWithPassword({ email, password }: { email: string; password: string }) {
    const rows = await svc(async (c) =>
      (
        await c.query<UserRow>(
          `select id, email, raw_user_meta_data, raw_app_meta_data, created_at from auth.users
            where lower(email) = lower($1) and encrypted_password is not null and encrypted_password <> ''
              and encrypted_password = extensions.crypt($2, encrypted_password)`,
          [email.trim(), password],
        )
      ).rows,
    );
    if (!rows[0]) return { data: { user: null, session: null }, error: { message: "Invalid login credentials", status: 400 } as AuthError };
    await svc((c) => c.query(`update auth.users set last_sign_in_at = now() where id = $1`, [rows[0].id]));
    await setSessionCookie(rows[0].id);
    return { data: { user: toUser(rows[0]), session: { user: toUser(rows[0]) } }, error: null };
  },

  async signUp({ email, password, options }: { email: string; password: string; options?: { data?: Record<string, unknown>; emailRedirectTo?: string } }) {
    const normalized = email.trim().toLowerCase();
    try {
      const rows = await svc(async (c) => {
        const exists = await c.query(`select 1 from auth.users where lower(email) = $1`, [normalized]);
        if (exists.rowCount) throw Object.assign(new Error("User already registered"), { status: 422 });
        // The on_auth_user_created trigger creates the profile + customer role
        return (
          await c.query<UserRow>(
            `insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
             values ('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated', $1,
                     extensions.crypt($2, extensions.gen_salt('bf', 10)), now(), '{"provider":"email","providers":["email"]}'::jsonb, $3::jsonb, now(), now())
             returning id, email, raw_user_meta_data, raw_app_meta_data, created_at`,
            [normalized, password, JSON.stringify(options?.data ?? {})],
          )
        ).rows;
      });
      await setSessionCookie(rows[0].id);
      const user = toUser(rows[0]);
      return { data: { user, session: { user } }, error: null };
    } catch (e) {
      return { data: { user: null, session: null }, error: { message: (e as Error).message, status: (e as { status?: number }).status ?? 400 } as AuthError };
    }
  },

  async signOut() {
    const jar = await cookies();
    const t = jar.get(SESSION_COOKIE)?.value;
    if (t) await svc((c) => c.query(`delete from auth.sessions where token_hash = $1`, [sha256(t)])).catch(() => {});
    jar.delete(SESSION_COOKIE);
    return { error: null };
  },

  async updateUser(attrs: { password?: string; data?: Record<string, unknown> }) {
    const user = await currentUser();
    if (!user) return { data: { user: null }, error: { message: "Auth session missing!", status: 401 } as AuthError };
    await svc(async (c) => {
      if (attrs.password) {
        await c.query(`update auth.users set encrypted_password = extensions.crypt($2, extensions.gen_salt('bf', 10)), updated_at = now() where id = $1`, [user.id, attrs.password]);
        // Sign out every other device after a password change
        const jar = await cookies();
        const t = jar.get(SESSION_COOKIE)?.value ?? "";
        await c.query(`delete from auth.sessions where user_id = $1 and token_hash <> $2`, [user.id, sha256(t)]);
      }
      if (attrs.data) {
        await c.query(`update auth.users set raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb) || $2::jsonb, updated_at = now() where id = $1`, [user.id, JSON.stringify(attrs.data)]);
      }
    });
    return { data: { user }, error: null };
  },

  /**
   * Creates a one-hour reset token and returns the link to email.
   * Never reveals whether the address exists.
   */
  async resetPasswordForEmail(email: string, opts: { redirectTo: string }): Promise<{ data: { link: string | null }; error: null }> {
    const t = token();
    const updated = await svc(async (c) =>
      (
        await c.query(`update auth.users set recovery_token = $2, recovery_sent_at = now() where lower(email) = lower($1) returning id`, [email.trim(), sha256(t)])
      ).rowCount,
    );
    if (!updated) return { data: { link: null }, error: null };
    const url = new URL(opts.redirectTo);
    url.searchParams.set("code", t);
    return { data: { link: url.toString() }, error: null };
  },

  /** Redeems a password-reset token for a session (single use). */
  async exchangeCodeForSession(code: string) {
    const rows = await svc(async (c) =>
      (
        await c.query<{ id: string }>(
          `update auth.users set recovery_token = null, recovery_sent_at = null
            where recovery_token = $1 and recovery_sent_at > now() - make_interval(mins => ${RESET_MINUTES})
            returning id`,
          [sha256(code)],
        )
      ).rows,
    );
    if (!rows[0]) return { error: { message: "Link is invalid or has expired", status: 400 } as AuthError };
    await setSessionCookie(rows[0].id);
    return { error: null };
  },
};
