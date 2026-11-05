import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { isPreviewMode, isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { ALL_PERMISSIONS, can, type Access, type PermissionKey } from "./permissions";

export const getSessionUser = cache(async (): Promise<User | null> => {
  if (!isSupabaseConfigured) return null;
  const supabase = await createServerSupabase();
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
});

const PREVIEW_ACCESS: Access = {
  userId: "preview",
  email: "preview@ravantra.test",
  name: "Preview Admin",
  roles: [{ key: "super_admin", name: "Super Admin (preview)", divisionId: null }],
  permissions: ALL_PERMISSIONS.map((key) => ({ key, divisionId: null })),
  isStaff: true,
  isSuperAdmin: true,
  preview: true,
};

type RawAccess = {
  roles: { key: string; name: string; division_id: string | null }[];
  permissions: { key: PermissionKey; division_id: string | null }[];
};

/** Resolves the signed-in user's roles & permissions from the database. */
export const getAccess = cache(async (): Promise<Access | null> => {
  if (isPreviewMode) return PREVIEW_ACCESS;
  const user = await getSessionUser();
  if (!user) return null;
  const supabase = await createServerSupabase();
  const [{ data }, { data: profile }] = await Promise.all([
    supabase.rpc("my_access"),
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
  ]);
  const raw = (data ?? { roles: [], permissions: [] }) as RawAccess;
  const roles = (raw.roles ?? []).map((r) => ({ key: r.key, name: r.name, divisionId: r.division_id }));
  return {
    userId: user.id,
    email: user.email ?? "",
    name: profile?.full_name || user.email || "",
    roles,
    permissions: (raw.permissions ?? []).map((p) => ({ key: p.key, divisionId: p.division_id })),
    isStaff: roles.some((r) => r.key !== "customer"),
    isSuperAdmin: roles.some((r) => r.key === "super_admin"),
    preview: false,
  };
});

/** Customer area guard */
export async function requireUser(next = "/account"): Promise<User> {
  const user = await getSessionUser();
  if (!user) redirect(`/login?next=${encodeURIComponent(next)}`);
  return user;
}

/** Admin area guard — any staff role */
export async function requireStaff(): Promise<Access> {
  const access = await getAccess();
  if (!access) redirect("/admin/login");
  if (!access.isStaff) redirect("/admin/login?error=not_staff");
  return access;
}

/** Page-level permission guard (renders the 403 screen via redirect) */
export async function requirePermission(perm: PermissionKey, divisionId?: string | null): Promise<Access> {
  const access = await requireStaff();
  if (!can(access, perm, divisionId)) redirect(`/admin?denied=${encodeURIComponent(perm)}`);
  return access;
}

export class AuthorizationError extends Error {}

/** For server actions: returns access or throws (never redirects mid-action). */
export async function assertPermission(perm: PermissionKey, divisionId?: string | null): Promise<Access> {
  const access = await getAccess();
  if (!access || !access.isStaff) throw new AuthorizationError("Please sign in with a staff account.");
  if (access.preview) throw new AuthorizationError("Preview mode is read-only. Connect Supabase to make changes.");
  if (!can(access, perm, divisionId)) throw new AuthorizationError("You don't have permission to do that.");
  return access;
}
