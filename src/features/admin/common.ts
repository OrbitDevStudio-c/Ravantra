import "server-only";
import { cache } from "react";
import * as demo from "@/config/demo-data";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { CATEGORY_COLUMNS, DIVISION_COLUMNS, mapCategory, mapDivision } from "@/features/catalog/mappers";
import type { Category, Division } from "@/types";
import type { ActivityRow } from "./types";
import { previewActivity } from "./preview-data";

/** All divisions incl. inactive (staff view). */
export const getAdminDivisions = cache(async (): Promise<Division[]> => {
  if (isPreviewMode) return demo.divisions;
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("business_divisions").select(DIVISION_COLUMNS).order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapDivision);
});

export const getAdminCategories = cache(async (): Promise<(Category & { isActive: boolean })[]> => {
  if (isPreviewMode) return demo.categories.map((c) => ({ ...c, isActive: true }));
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("categories").select(`${CATEGORY_COLUMNS}, is_active`).order("sort_order");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ ...mapCategory(r), isActive: r.is_active as boolean }));
});

export async function getRecentActivity(limit = 8): Promise<ActivityRow[]> {
  if (isPreviewMode) return previewActivity().slice(0, limit);
  const sb = await createServerSupabase();
  const { data, error } = await sb
    .from("activity_logs")
    .select("id, action, summary, created_at, actor:profiles(full_name)")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) return [];
  return (data ?? []).map((r) => ({
    id: r.id,
    action: r.action,
    summary: r.summary,
    createdAt: r.created_at,
    actor: (Array.isArray(r.actor) ? r.actor[0]?.full_name : (r.actor as { full_name?: string } | null)?.full_name) ?? null,
  }));
}

export function divisionName(divisions: Division[], id: string | null | undefined) {
  return divisions.find((d) => d.id === id)?.shortName ?? "—";
}

export function str(v: string | string[] | undefined) {
  return typeof v === "string" ? v : undefined;
}

export function pageNum(v: string | string[] | undefined) {
  const n = Number(str(v) ?? 1);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

/** Strip characters that would break PostgREST `or()` filter syntax. */
export function safeSearch(q: string | undefined) {
  return (q ?? "").replace(/[^\p{L}\p{N}@.\-_ ]/gu, "").trim().slice(0, 60);
}
