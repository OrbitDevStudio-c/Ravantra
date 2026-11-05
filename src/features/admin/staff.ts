import "server-only";
import * as demo from "@/config/demo-data";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export interface RoleRow {
  id: string;
  key: string;
  name: string;
  divisionId: string | null;
  permissions: string[];
}
export interface StaffRow {
  userId: string;
  name: string;
  email: string;
  roles: { id: string; key: string; name: string }[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export async function listRoles(): Promise<RoleRow[]> {
  if (isPreviewMode) {
    return demo.roles.map((r, i) => ({
      id: demo.u(15, i + 1),
      key: r.key,
      name: r.name,
      divisionId: r.division ? demo.DIVISION_IDS[r.division] : null,
      permissions: r.perms === "*" ? demo.permissions.map((p) => p[0]) : [...r.perms],
    }));
  }
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("roles").select("id, key, name, division_id, role_permissions(permissions(key))").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({
    id: r.id,
    key: r.key,
    name: r.name,
    divisionId: r.division_id,
    permissions: (r.role_permissions ?? []).map((rp: any) => (Array.isArray(rp.permissions) ? rp.permissions[0]?.key : rp.permissions?.key)).filter(Boolean),
  }));
}

export async function listStaff(): Promise<StaffRow[]> {
  if (isPreviewMode) {
    const roles = await listRoles();
    return demo.adminUsers.map((u) => {
      const r = roles.find((x) => x.key === u.role)!;
      return { userId: u.id, name: u.name, email: u.email, roles: [{ id: r.id, key: r.key, name: r.name }] };
    });
  }
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("user_roles").select("user_id, role:roles!inner(id, key, name), profile:profiles(full_name, email)").neq("role.key", "customer");
  if (error) throw new Error(error.message);
  const map = new Map<string, StaffRow>();
  for (const r of data ?? []) {
    const role = Array.isArray((r as any).role) ? (r as any).role[0] : (r as any).role;
    const p = Array.isArray((r as any).profile) ? (r as any).profile[0] : (r as any).profile;
    if (!role || role.key === "customer") continue;
    const row = map.get((r as any).user_id) ?? { userId: (r as any).user_id, name: p?.full_name ?? "", email: p?.email ?? "", roles: [] as StaffRow["roles"] };
    row.roles.push({ id: role.id, key: role.key, name: role.name });
    map.set(row.userId, row);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}
