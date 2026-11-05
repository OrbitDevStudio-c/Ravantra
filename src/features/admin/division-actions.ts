"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { canGlobal } from "@/lib/auth/permissions";
import { guarded, logActivity, must, revalidateCatalog, UserError, type ActionCtx } from "./shared";
import type { AdminResult } from "./types";

const PRODUCT_MANAGER_PERMS = ["dashboard.view", "products.manage", "inventory.manage", "orders.view", "orders.manage", "reports.view"];
const SERVICE_MANAGER_PERMS = ["dashboard.view", "appointments.manage", "reports.view", "customers.view"];

const divisionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2).max(80),
  shortName: z.string().trim().min(2).max(40),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers, dashes"),
  tagline: z.string().trim().max(120),
  description: z.string().trim().max(1000),
  kind: z.enum(["products", "services"]),
  accentColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, "Accent must be #RRGGBB"),
  heroImage: z.url().optional().or(z.literal("")),
  bannerImage: z.url().optional().or(z.literal("")),
  logoUrl: z.url().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

const RESERVED = ["admin", "api", "products", "services", "cart", "checkout", "account", "about", "contact", "login", "register", "auth", "salon-spa"];

/** Ensures the division-scoped manager role exists (used for new/future divisions). */
async function ensureManagerRole(ctx: ActionCtx, divisionId: string, slug: string, kind: "products" | "services", shortName: string) {
  const existing = must(await ctx.sb.from("roles").select("id").eq("division_id", divisionId).like("key", "%_manager").limit(1)) as { id: string }[];
  if (existing.length) return existing[0].id;
  const key = `${slug.replace(/-/g, "_")}_manager`;
  const role = must(await ctx.sb.from("roles").insert({ key, name: `${shortName} Manager`, division_id: divisionId, is_system: false }).select("id").single()) as { id: string };
  const perms = must(await ctx.sb.from("permissions").select("id, key").in("key", kind === "products" ? PRODUCT_MANAGER_PERMS : SERVICE_MANAGER_PERMS)) as { id: string }[];
  if (perms.length) must(await ctx.sb.from("role_permissions").insert(perms.map((p) => ({ role_id: role.id, permission_id: p.id }))));
  return role.id;
}

export async function saveDivision(input: z.input<typeof divisionSchema>): Promise<AdminResult<{ id: string }>> {
  const parsed = divisionSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid division" };
  const d = parsed.data;
  if (!d.id && RESERVED.includes(d.slug)) return { ok: false, error: "That slug is reserved by the website. Choose another." };
  return guarded("divisions.manage", async (ctx) => {
    if (!canGlobal(ctx.access, "divisions.manage")) throw new UserError("Only global administrators can manage divisions.");
    const row = {
      name: d.name,
      short_name: d.shortName,
      slug: d.slug,
      tagline: d.tagline,
      description: d.description,
      kind: d.kind,
      accent_color: d.accentColor.toUpperCase(),
      hero_image: d.heroImage || null,
      banner_image: d.bannerImage || null,
      logo_url: d.logoUrl || null,
      sort_order: d.sortOrder,
      is_active: d.isActive,
    };
    let id = d.id;
    if (id) {
      must(await ctx.sb.from("business_divisions").update(row).eq("id", id));
    } else {
      id = (must(await ctx.sb.from("business_divisions").insert(row).select("id").single()) as { id: string }).id;
      try {
        await ensureManagerRole(ctx, id, d.slug, d.kind, d.shortName);
      } catch (e) {
        console.error("[division] manager role", e);
      }
    }
    await logActivity(ctx, { action: d.id ? "division.updated" : "division.created", entityType: "division", entityId: id, divisionId: id, summary: `${d.id ? "Updated" : "Created"} division ${d.name}` });
    revalidateCatalog();
    revalidatePath("/admin/divisions");
    return { id: id! };
  });
}

export async function setDivisionActive(id: string, active: boolean) {
  return guarded("divisions.manage", async (ctx) => {
    const did = z.uuid().parse(id);
    const rows = must(await ctx.sb.from("business_divisions").update({ is_active: active }).eq("id", did).select("name"));
    if (!rows.length) throw new UserError("Division not found.");
    await logActivity(ctx, { action: "division.updated", entityType: "division", entityId: did, divisionId: did, summary: `${rows[0].name} ${active ? "activated" : "deactivated"}` });
    revalidateCatalog();
    revalidatePath("/admin/divisions");
  });
}

/** Assign a manager by email: division_managers row + the division's scoped role. */
export async function assignManager(divisionId: string, email: string) {
  return guarded("divisions.manage", async (ctx) => {
    const did = z.uuid().parse(divisionId);
    const mail = z.email("Enter a valid email").parse(email.trim().toLowerCase());
    if (!canGlobal(ctx.access, "settings.manage")) throw new UserError("Assigning roles requires the settings permission (super admin).");
    const profile = must(await ctx.sb.from("profiles").select("id, full_name").ilike("email", mail).maybeSingle()) as { id: string; full_name: string } | null;
    if (!profile) throw new UserError("No account with that email. Ask them to register first.");
    const div = must(await ctx.sb.from("business_divisions").select("slug, kind, short_name").eq("id", did).single()) as { slug: string; kind: "products" | "services"; short_name: string };
    const roleId = await ensureManagerRole(ctx, did, div.slug, div.kind, div.short_name);
    must(await ctx.sb.from("division_managers").upsert({ division_id: did, user_id: profile.id, title: `${div.short_name} Manager` }, { onConflict: "division_id,user_id" }));
    must(await ctx.sb.from("user_roles").upsert({ user_id: profile.id, role_id: roleId }, { onConflict: "user_id,role_id", ignoreDuplicates: true }));
    await logActivity(ctx, { action: "division.manager_assigned", entityType: "division", entityId: did, divisionId: did, summary: `${profile.full_name || mail} assigned as ${div.short_name} manager` });
    revalidatePath("/admin/divisions");
    revalidatePath(`/admin/divisions/${did}`);
  });
}

export async function removeManager(divisionId: string, userId: string) {
  return guarded("divisions.manage", async (ctx) => {
    const did = z.uuid().parse(divisionId);
    const uid = z.uuid().parse(userId);
    if (!canGlobal(ctx.access, "settings.manage")) throw new UserError("Removing roles requires the settings permission (super admin).");
    must(await ctx.sb.from("division_managers").delete().eq("division_id", did).eq("user_id", uid));
    const roles = must(await ctx.sb.from("roles").select("id").eq("division_id", did)) as { id: string }[];
    if (roles.length) must(await ctx.sb.from("user_roles").delete().eq("user_id", uid).in("role_id", roles.map((r) => r.id)));
    await logActivity(ctx, { action: "division.manager_removed", entityType: "division", entityId: did, divisionId: did, summary: "Removed a division manager" });
    revalidatePath(`/admin/divisions/${did}`);
  });
}
