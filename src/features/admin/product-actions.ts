"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { fieldErrors } from "@/lib/validations";
import { productFormSchema, variantDisplayName, type ProductFormValues } from "./product-schema";
import { guarded, logActivity, must, revalidateCatalog, UserError } from "./shared";
import type { AdminResult } from "./types";

const num = (s: string | undefined) => (s && s.trim() !== "" ? Number(s) : null);
const lines = (s: string) => s.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 20);
const csv = (s: string) => [...new Set(s.split(",").map((x) => x.trim().toLowerCase()).filter(Boolean))].slice(0, 20);

/**
 * Create or update a product with its images and variants.
 * RLS (products.manage scoped to the division) is enforced on every write.
 */
export async function saveProduct(values: ProductFormValues): Promise<AdminResult<{ id: string }>> {
  const parsed = productFormSchema.safeParse(values);
  if (!parsed.success) return { ok: false, error: "Please fix the highlighted fields.", fieldErrors: fieldErrors(parsed.error) };
  const v = parsed.data;

  return guarded(
    "products.manage",
    async (ctx) => {
      const { sb } = ctx;
      const cat = must(await sb.from("categories").select("id, division_id").eq("id", v.categoryId).maybeSingle());
      if (!cat || cat.division_id !== v.divisionId) throw new UserError("The category doesn't belong to the selected division.");

      const row = {
        name: v.name,
        slug: v.slug,
        division_id: v.divisionId,
        category_id: v.categoryId,
        sku: v.sku.toUpperCase(),
        price: Number(v.price),
        sale_price: num(v.salePrice),
        short_description: v.shortDescription,
        description: v.description,
        ingredients: v.ingredients || null,
        highlights: lines(v.highlights),
        tags: csv(v.tags),
        is_featured: v.isFeatured,
        is_new: v.isNew,
        is_active: v.isActive,
      };

      let productId = v.id;
      if (productId) {
        const updated = must(await sb.from("products").update(row).eq("id", productId).select("id"));
        if (!updated.length) throw new UserError("You don't have permission to edit this product.");
      } else {
        const created = must(await sb.from("products").insert(row).select("id").single());
        productId = created.id as string;
      }

      /* ---- images: delete removed, upsert the rest in order ---- */
      const existingImgs = must(await sb.from("product_images").select("id").eq("product_id", productId)) as { id: string }[];
      const keepImg = new Set(v.images.map((i) => i.id).filter(Boolean));
      const removeImgs = existingImgs.filter((i) => !keepImg.has(i.id)).map((i) => i.id);
      if (removeImgs.length) must(await sb.from("product_images").delete().in("id", removeImgs));
      for (const [i, im] of v.images.entries()) {
        const data = { product_id: productId, url: im.url, alt: im.alt || v.name, sort_order: i };
        if (im.id) must(await sb.from("product_images").update(data).eq("id", im.id));
        else must(await sb.from("product_images").insert(data));
      }

      /* ---- variants ---- */
      const existingVars = must(await sb.from("product_variants").select("id").eq("product_id", productId)) as { id: string }[];
      const keepVar = new Set(v.variants.map((x) => x.id).filter(Boolean));
      const removeVars = existingVars.filter((x) => !keepVar.has(x.id)).map((x) => x.id);
      if (removeVars.length) must(await sb.from("product_variants").delete().in("id", removeVars));

      const opening: { id: string; qty: number }[] = [];
      for (const [i, vr] of v.variants.entries()) {
        const data = {
          product_id: productId,
          sku: vr.sku.toUpperCase(),
          name: variantDisplayName(vr),
          size: vr.size || null,
          color: vr.color || null,
          color_hex: vr.colorHex || null,
          volume: vr.volume || null,
          price: num(vr.price),
          sale_price: num(vr.salePrice),
          is_active: vr.isActive,
          sort_order: i,
        };
        if (vr.id) {
          must(await sb.from("product_variants").update(data).eq("id", vr.id));
        } else {
          const created = must(await sb.from("product_variants").insert(data).select("id").single());
          const qty = Number(vr.openingStock || 0);
          if (qty > 0) opening.push({ id: created.id as string, qty });
        }
      }
      // opening stock goes through the audited stock function (requires inventory.manage)
      for (const o of opening) {
        const { error } = await sb.rpc("adjust_stock", { p_variant: o.id, p_change: o.qty, p_reason: "restock", p_note: "Opening stock" });
        if (error) throw new UserError("Product saved, but opening stock needs an inventory manager to set it.");
      }

      await logActivity(ctx, {
        action: v.id ? "product.updated" : "product.created",
        entityType: "product",
        entityId: productId,
        divisionId: v.divisionId,
        summary: `${v.id ? "Updated" : "Added"} ${v.name}`,
      });
      revalidateCatalog();
      revalidatePath("/admin/products");
      return { id: productId! };
    },
    v.divisionId,
  );
}

export async function deleteProduct(productId: string) {
  return guarded("products.manage", async (ctx) => {
    const id = z.uuid().parse(productId);
    const { count } = await ctx.sb.from("order_items").select("id", { count: "exact", head: true }).eq("product_id", id);
    if ((count ?? 0) > 0) throw new UserError("This product has orders. Deactivate it instead so order history stays intact.");
    const p = must(await ctx.sb.from("products").select("name, division_id").eq("id", id).maybeSingle());
    if (!p) throw new UserError("Product not found.");
    const deleted = must(await ctx.sb.from("products").delete().eq("id", id).select("id"));
    if (!deleted.length) throw new UserError("You don't have permission to delete this product.");
    await logActivity(ctx, { action: "product.deleted", entityType: "product", entityId: id, divisionId: p.division_id, summary: `Deleted ${p.name}` });
    revalidateCatalog();
    revalidatePath("/admin/products");
  });
}

export async function setProductFlag(productId: string, flag: "is_active" | "is_featured", value: boolean) {
  return guarded("products.manage", async (ctx) => {
    const id = z.uuid().parse(productId);
    if (flag !== "is_active" && flag !== "is_featured") throw new UserError("Invalid flag.");
    const rows = must(await ctx.sb.from("products").update({ [flag]: value }).eq("id", id).select("id, name, division_id"));
    if (!rows.length) throw new UserError("You don't have permission to edit this product.");
    await logActivity(ctx, {
      action: "product.updated",
      entityType: "product",
      entityId: id,
      divisionId: rows[0].division_id,
      summary: `${rows[0].name}: ${flag === "is_active" ? (value ? "activated" : "deactivated") : value ? "featured" : "unfeatured"}`,
    });
    revalidateCatalog();
    revalidatePath("/admin/products");
  });
}

/* ---------------- Categories ---------------- */

const categorySchema = z.object({
  id: z.string().optional(),
  divisionId: z.uuid(),
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Lowercase letters, numbers and dashes"),
  description: z.string().trim().max(240).optional(),
  image: z.url().optional().or(z.literal("")),
  sortOrder: z.number().int().min(0).max(999),
  isFeatured: z.boolean(),
  isActive: z.boolean(),
});

export async function saveCategory(input: z.input<typeof categorySchema>) {
  const parsed = categorySchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid category" };
  const c = parsed.data;
  return guarded(
    "products.manage",
    async (ctx) => {
      const row = {
        division_id: c.divisionId,
        name: c.name,
        slug: c.slug,
        description: c.description || null,
        image: c.image || null,
        sort_order: c.sortOrder,
        is_featured: c.isFeatured,
        is_active: c.isActive,
      };
      if (c.id) {
        const r = must(await ctx.sb.from("categories").update(row).eq("id", c.id).select("id"));
        if (!r.length) throw new UserError("You don't have permission to edit this category.");
      } else {
        must(await ctx.sb.from("categories").insert(row));
      }
      await logActivity(ctx, { action: c.id ? "category.updated" : "category.created", entityType: "category", divisionId: c.divisionId, summary: `${c.id ? "Updated" : "Created"} category ${c.name}` });
      revalidateCatalog();
      revalidatePath("/admin/products/categories");
    },
    c.divisionId,
  );
}
