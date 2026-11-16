/* eslint-disable @typescript-eslint/no-explicit-any -- untyped rows, matching supabase-js without generated types (callers narrow) */
import "server-only";
import type { PoolClient } from "@neondatabase/serverless";
import { isDatabaseConfigured } from "@/lib/env";
import { auth, currentUser } from "@/lib/auth/neon-auth";
import { withContext, type DbContext } from "./pool";
import { QueryBuilder, RpcBuilder, type Runner } from "./postgrest";

/**
 * Database clients with a supabase-js compatible surface (`from`, `rpc`, `auth`),
 * backed by Neon Postgres. Every call runs in its own transaction as the right role,
 * so the row-level-security policies in supabase/migrations keep doing the work.
 */
export interface DbClient {
  from<T = any[]>(table: string): QueryBuilder<T>;
  rpc<T = any>(fn: string, args?: Record<string, unknown>): RpcBuilder<T>;
  auth: typeof auth;
}

function client(resolve: () => Promise<DbContext>): DbClient {
  const run: Runner = async <T>(fn: (c: PoolClient) => Promise<T>) => withContext(await resolve(), fn);
  return {
    from: (table) => new QueryBuilder(table, run),
    rpc: (fn, args = {}) => new RpcBuilder(fn, args, run),
    auth,
  };
}

function assertConfigured() {
  if (!isDatabaseConfigured) throw new Error("Database is not configured (set DATABASE_URL)");
}

/** Request-scoped client acting as the signed-in visitor (RLS applies). */
export async function createServerDb(): Promise<DbClient> {
  assertConfigured();
  return client(async () => {
    const user = await currentUser();
    return user ? { role: "authenticated", uid: user.id } : { role: "anon" };
  });
}

/** Anonymous client for public catalogue reads (cookie-free, cache-friendly). */
export function createPublicDb(): DbClient {
  assertConfigured();
  return client(async () => ({ role: "anon" }));
}

/**
 * Service client — bypasses RLS. Only for trusted server code paths
 * (payment verification, webhooks, cron, refunds) AFTER explicit authorization.
 */
export function createServiceDb(): DbClient {
  assertConfigured();
  return client(async () => ({ role: "service" }));
}
