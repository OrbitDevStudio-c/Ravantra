"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guarded, logActivity, must, revalidateCatalog, UserError } from "./shared";

const dt = z.string().trim().optional().or(z.literal(""));
const toIso = (s?: string) => (s ? new Date(`${s}T00:00:00+05:30`).toISOString() : null);

const promoSchema = z.object({
  id: z.string().optional(),
  eyebrow: z.string().trim().max(80),
  title: z.string().trim().min(2).max(120),
  subtitle: z.string().trim().max(240),
  ctaLabel: z.string().trim().min(1).max(40),
  ctaHref: z.string().trim().regex(/^\/[^\s]*$/, "Use an internal link starting with /"),
  image: z.url().optional().or(z.literal("")),
  placement: z.enum(["home_banner", "home_strip", "division_banner"]),
  divisionId: z.string().optional().or(z.literal("")),
  startsAt: dt,
  endsAt: dt,
  isActive: z.boolean(),
  sortOrder: z.number().int().min(0).max(999),
});

export async function savePromotion(input: z.input<typeof promoSchema>) {
  const parsed = promoSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid promotion" };
  const p = parsed.data;
  return guarded("marketing.manage", async (ctx) => {
    if (p.startsAt && p.endsAt && p.endsAt <= p.startsAt) throw new UserError("End date must be after the start date.");
    const row = {
      eyebrow: p.eyebrow,
      title: p.title,
      subtitle: p.subtitle,
      cta_label: p.ctaLabel,
      cta_href: p.ctaHref,
      image: p.image || null,
      placement: p.placement,
      division_id: p.divisionId || null,
      starts_at: toIso(p.startsAt),
      ends_at: toIso(p.endsAt),
      is_active: p.isActive,
      sort_order: p.sortOrder,
    };
    if (p.id) must(await ctx.sb.from("promotions").update(row).eq("id", p.id));
    else must(await ctx.sb.from("promotions").insert(row));
    await logActivity(ctx, { action: p.id ? "promotion.updated" : "promotion.created", entityType: "promotion", summary: `${p.id ? "Updated" : "Created"} campaign “${p.title}”` });
    revalidateCatalog();
    revalidatePath("/admin/marketing");
  });
}

export async function deletePromotion(id: string) {
  return guarded("marketing.manage", async (ctx) => {
    must(await ctx.sb.from("promotions").delete().eq("id", z.uuid().parse(id)));
    await logActivity(ctx, { action: "promotion.deleted", entityType: "promotion", entityId: id, summary: "Deleted a campaign" });
    revalidateCatalog();
    revalidatePath("/admin/marketing");
  });
}

const couponSchema = z.object({
  id: z.string().optional(),
  code: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3,24}$/, "Code: 3–24 letters/numbers"),
  description: z.string().trim().max(160),
  discountType: z.enum(["percent", "fixed"]),
  discountValue: z.number().positive(),
  minSubtotal: z.number().min(0),
  maxDiscount: z.number().positive().nullable(),
  divisionId: z.string().optional().or(z.literal("")),
  startsAt: dt,
  endsAt: dt,
  usageLimit: z.number().int().positive().nullable(),
  isActive: z.boolean(),
});

export async function saveCoupon(input: z.input<typeof couponSchema>) {
  const parsed = couponSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid coupon" };
  const c = parsed.data;
  if (c.discountType === "percent" && c.discountValue > 90) return { ok: false as const, error: "Percentage discounts are capped at 90%." };
  return guarded("marketing.manage", async (ctx) => {
    const row = {
      code: c.code,
      description: c.description,
      discount_type: c.discountType,
      discount_value: c.discountValue,
      min_subtotal: c.minSubtotal,
      max_discount: c.maxDiscount,
      division_id: c.divisionId || null,
      starts_at: toIso(c.startsAt),
      ends_at: toIso(c.endsAt),
      usage_limit: c.usageLimit,
      is_active: c.isActive,
    };
    if (c.id) must(await ctx.sb.from("coupons").update(row).eq("id", c.id));
    else must(await ctx.sb.from("coupons").insert(row));
    await logActivity(ctx, { action: c.id ? "coupon.updated" : "coupon.created", entityType: "coupon", summary: `${c.id ? "Updated" : "Created"} coupon ${c.code}` });
    revalidatePath("/admin/marketing");
  });
}

export async function setCouponActive(id: string, active: boolean) {
  return guarded("marketing.manage", async (ctx) => {
    must(await ctx.sb.from("coupons").update({ is_active: active }).eq("id", z.uuid().parse(id)));
    revalidatePath("/admin/marketing");
  });
}

export async function setCategoryFeatured(id: string, featured: boolean) {
  return guarded("marketing.manage", async (ctx) => {
    const rows = must(await ctx.sb.from("categories").update({ is_featured: featured }).eq("id", z.uuid().parse(id)).select("id"));
    if (!rows.length) throw new UserError("You don't have permission to edit this category.");
    revalidateCatalog();
    revalidatePath("/admin/marketing");
  });
}

export async function setProductFeatured(id: string, featured: boolean) {
  return guarded("marketing.manage", async (ctx) => {
    const rows = must(await ctx.sb.from("products").update({ is_featured: featured }).eq("id", z.uuid().parse(id)).select("id"));
    if (!rows.length) throw new UserError("You need product permissions for this division to change featured products.");
    revalidateCatalog();
    revalidatePath("/admin/marketing");
  });
}

export async function setSubscriberActive(id: string, active: boolean) {
  return guarded("marketing.manage", async (ctx) => {
    must(await ctx.sb.from("newsletter_subscribers").update({ is_active: active }).eq("id", z.uuid().parse(id)));
    revalidatePath("/admin/marketing");
  });
}
