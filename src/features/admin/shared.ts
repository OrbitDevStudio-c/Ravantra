import "server-only";
import { revalidatePath, updateTag } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { assertPermission, AuthorizationError } from "@/lib/auth/session";
import type { Access, PermissionKey } from "@/lib/auth/permissions";
import { createServerSupabase } from "@/lib/supabase/server";
import { friendlyDbError } from "@/lib/utils";
import type { AdminResult } from "./types";

/** Error whose message is safe to show to the admin as-is. */
export class UserError extends Error {}

export interface ActionCtx {
  access: Access;
  sb: SupabaseClient;
}

/**
 * Standard admin server-action wrapper:
 *  1. server-side permission check (assertPermission — preview mode is read-only)
 *  2. runs with the RLS-bound client, so Postgres enforces the same rule again
 *  3. normalises errors into AdminResult
 */
export async function guarded<T = undefined>(
  perm: PermissionKey,
  fn: (ctx: ActionCtx) => Promise<T>,
  division?: string | null,
): Promise<AdminResult<T>> {
  try {
    const access = await assertPermission(perm, division);
    const sb = await createServerSupabase();
    const data = await fn({ access, sb });
    return { ok: true, data };
  } catch (e) {
    if (e instanceof AuthorizationError || e instanceof UserError) return { ok: false, error: e.message };
    const message = (e as { message?: string })?.message;
    console.error("[admin action]", message ?? e);
    return { ok: false, error: friendlyDbError(message) };
  }
}

/** Unwrap a Supabase response, throwing on error. (Untyped client → caller narrows the shape.) */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function must<T = any>(res: { data: unknown; error: { message: string } | null }): T {
  if (res.error) throw new Error(res.error.message);
  return res.data as T;
}

export async function logActivity(
  ctx: ActionCtx,
  entry: { action: string; entityType: string; entityId?: string | null; divisionId?: string | null; summary: string; metadata?: Record<string, unknown> },
) {
  await ctx.sb.from("activity_logs").insert({
    actor_id: ctx.access.userId,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId ?? null,
    division_id: entry.divisionId ?? null,
    summary: entry.summary.slice(0, 280),
    metadata: entry.metadata ?? {},
  });
}

/** Catalogue changed → refresh cached storefront data immediately. */
export function revalidateCatalog() {
  updateTag("catalog");
  revalidatePath("/", "layout");
}

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/avif"] as const;
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
