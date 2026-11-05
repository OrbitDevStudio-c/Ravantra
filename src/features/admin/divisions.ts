import "server-only";
import * as demo from "@/config/demo-data";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export interface DivisionManager {
  id: string;
  userId: string;
  name: string;
  email: string;
  title: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function listDivisionManagers(divisionId?: string): Promise<(DivisionManager & { divisionId: string })[]> {
  if (isPreviewMode) {
    return demo.adminUsers
      .map((u) => ({ u, role: demo.roles.find((r) => r.key === u.role) }))
      .filter((x) => x.role?.division)
      .map(({ u, role }) => ({ id: u.id, userId: u.id, name: u.name, email: u.email, title: role!.name, divisionId: demo.DIVISION_IDS[role!.division!] }))
      .filter((m) => !divisionId || m.divisionId === divisionId);
  }
  const sb = await createServerSupabase();
  let q = sb.from("division_managers").select("id, division_id, user_id, title, profile:profiles(full_name, email)");
  if (divisionId) q = q.eq("division_id", divisionId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((m: any) => {
    const p = Array.isArray(m.profile) ? m.profile[0] : m.profile;
    return { id: m.id, userId: m.user_id, divisionId: m.division_id, title: m.title, name: p?.full_name ?? "", email: p?.email ?? "" };
  });
}

export async function divisionProductCounts(): Promise<Record<string, number>> {
  if (isPreviewMode) {
    const out: Record<string, number> = {};
    demo.products.forEach((p) => (out[p.divisionId] = (out[p.divisionId] ?? 0) + 1));
    out[demo.DIVISION_IDS.salon] = demo.services.length;
    return out;
  }
  const sb = await createServerSupabase();
  const [{ data: products }, { data: services }] = await Promise.all([sb.from("products").select("division_id"), sb.from("services").select("division_id")]);
  const out: Record<string, number> = {};
  [...(products ?? []), ...(services ?? [])].forEach((r: any) => (out[r.division_id] = (out[r.division_id] ?? 0) + 1));
  return out;
}
