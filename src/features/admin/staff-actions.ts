"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canGlobal } from "@/lib/auth/permissions";
import { guarded, logActivity, must, UserError } from "./shared";

export async function grantRole(email: string, roleId: string) {
  return guarded("settings.manage", async (ctx) => {
    if (!canGlobal(ctx.access, "settings.manage")) throw new UserError("Only global administrators can manage staff roles.");
    const mail = z.email("Enter a valid email").parse(email.trim().toLowerCase());
    const rid = z.uuid().parse(roleId);
    const profile = must(await ctx.sb.from("profiles").select("id, full_name").ilike("email", mail).maybeSingle()) as { id: string; full_name: string } | null;
    if (!profile) throw new UserError("No account with that email. Ask them to register on the storefront first.");
    const role = must(await ctx.sb.from("roles").select("id, name, key, division_id").eq("id", rid).single()) as { name: string; key: string; division_id: string | null };
    must(await ctx.sb.from("user_roles").upsert({ user_id: profile.id, role_id: rid }, { onConflict: "user_id,role_id", ignoreDuplicates: true }));
    if (role.division_id && role.key.endsWith("_manager")) {
      await ctx.sb.from("division_managers").upsert({ division_id: role.division_id, user_id: profile.id, title: role.name }, { onConflict: "division_id,user_id" });
    }
    await logActivity(ctx, { action: "staff.role_granted", entityType: "user", entityId: profile.id, summary: `Granted ${role.name} to ${profile.full_name || mail}` });
    revalidatePath("/admin/staff");
  });
}

export async function revokeRole(userId: string, roleId: string) {
  return guarded("settings.manage", async (ctx) => {
    if (!canGlobal(ctx.access, "settings.manage")) throw new UserError("Only global administrators can manage staff roles.");
    const uid = z.uuid().parse(userId);
    const rid = z.uuid().parse(roleId);
    const role = must(await ctx.sb.from("roles").select("key, name, division_id").eq("id", rid).single()) as { key: string; name: string; division_id: string | null };
    if (uid === ctx.access.userId && role.key === "super_admin") throw new UserError("You can't remove your own super admin role.");
    if (role.key === "super_admin") {
      const { count } = await ctx.sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role_id", rid);
      if ((count ?? 0) <= 1) throw new UserError("At least one super admin must remain.");
    }
    must(await ctx.sb.from("user_roles").delete().eq("user_id", uid).eq("role_id", rid));
    if (role.division_id) await ctx.sb.from("division_managers").delete().eq("user_id", uid).eq("division_id", role.division_id);
    await logActivity(ctx, { action: "staff.role_revoked", entityType: "user", entityId: uid, summary: `Revoked ${role.name}` });
    revalidatePath("/admin/staff");
  });
}
