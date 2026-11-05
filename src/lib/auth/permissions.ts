/** Pure permission helpers — safe on server and client. */

export type PermissionKey =
  | "dashboard.view"
  | "divisions.manage"
  | "products.manage"
  | "inventory.manage"
  | "orders.view"
  | "orders.manage"
  | "appointments.manage"
  | "customers.view"
  | "marketing.manage"
  | "reports.view"
  | "settings.manage";

export const ALL_PERMISSIONS: PermissionKey[] = [
  "dashboard.view",
  "divisions.manage",
  "products.manage",
  "inventory.manage",
  "orders.view",
  "orders.manage",
  "appointments.manage",
  "customers.view",
  "marketing.manage",
  "reports.view",
  "settings.manage",
];

export interface Access {
  userId: string;
  email: string;
  name: string;
  roles: { key: string; name: string; divisionId: string | null }[];
  permissions: { key: PermissionKey; divisionId: string | null }[];
  isStaff: boolean;
  isSuperAdmin: boolean;
  /** Preview mode (no Supabase) — read-only demo of the admin */
  preview: boolean;
}

/**
 * Mirrors public.has_permission():
 *  - divisionId undefined/null → "in any scope"
 *  - divisionId set → global grant or a grant scoped to that division
 */
export function can(access: Access | null | undefined, perm: PermissionKey, divisionId?: string | null) {
  if (!access) return false;
  return access.permissions.some(
    (p) => p.key === perm && (p.divisionId === null || !divisionId || p.divisionId === divisionId),
  );
}

/** Global (unscoped) grant only — mirrors public.has_global_permission() */
export function canGlobal(access: Access | null | undefined, perm: PermissionKey) {
  if (!access) return false;
  return access.permissions.some((p) => p.key === perm && p.divisionId === null);
}

/** Divisions a scoped user may act on for a permission (null = all) */
export function scopedDivisions(access: Access | null | undefined, perm: PermissionKey): string[] | null {
  if (!access) return [];
  const grants = access.permissions.filter((p) => p.key === perm);
  if (grants.some((g) => g.divisionId === null)) return null;
  return grants.map((g) => g.divisionId!).filter(Boolean);
}
