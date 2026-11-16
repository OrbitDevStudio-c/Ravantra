import "server-only";
import { Pool, neonConfig, type PoolClient } from "@neondatabase/serverless";
import ws from "ws";
import { DATABASE_URL } from "@/lib/env";

// Node < 22 has no global WebSocket; the `ws` package fills the gap everywhere.
neonConfig.webSocketConstructor = ws;

declare global {
  // Survive Next.js dev hot-reloads without opening a new pool each time
  var __ravantraPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!DATABASE_URL) throw new Error("DATABASE_URL is not configured");
  if (!globalThis.__ravantraPool) {
    globalThis.__ravantraPool = new Pool({ connectionString: DATABASE_URL, max: 10, idleTimeoutMillis: 30_000 });
  }
  return globalThis.__ravantraPool;
}

/** Who a query runs as. Mirrors Supabase's anon / authenticated / service_role model. */
export type DbRole = "anon" | "authenticated" | "service";
export interface DbContext {
  role: DbRole;
  /** auth.uid() for RLS policies and security-definer functions */
  uid?: string | null;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Run `fn` inside a transaction scoped to the given role and user, so every
 * row-level-security policy and auth.uid() call behaves exactly as on Supabase.
 * "service" runs as the database owner (bypasses RLS) — trusted server paths only.
 */
export async function withContext<T>(ctx: DbContext, fn: (c: PoolClient) => Promise<T>): Promise<T> {
  const client = await getPool().connect();
  try {
    const uid = ctx.uid && UUID.test(ctx.uid) ? ctx.uid : "";
    const role = ctx.role === "service" ? null : ctx.role;
    // Both values are validated / from a fixed set, so inlining them is safe.
    await client.query(
      `begin;${role ? ` set local role ${role};` : ""} select set_config('request.jwt.claim.sub', '${uid}', true), set_config('request.jwt.claim.role', '${role ?? "service_role"}', true);`,
    );
    const out = await fn(client);
    await client.query("commit");
    return out;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}
