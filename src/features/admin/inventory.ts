import "server-only";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { previewInventory, previewMovements } from "./preview-data";
import type { InventoryRow, MovementRow } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const one = (v: any) => (Array.isArray(v) ? v[0] : v);

export async function listInventory(f: { division?: string; stock?: string; q?: string } = {}): Promise<InventoryRow[]> {
  let rows: InventoryRow[];
  if (isPreviewMode) {
    rows = previewInventory();
  } else {
    const sb = await createServerSupabase();
    let query = sb
      .from("product_variants")
      .select("id, sku, name, is_active, product:products!inner(id, name, slug, division_id, product_images(url, sort_order)), inventory(quantity, low_stock_threshold)")
      .order("sku")
      .limit(2000);
    if (f.division) query = query.eq("product.division_id", f.division);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows = (data ?? []).map((v: any) => {
      const p = one(v.product);
      const inv = one(v.inventory);
      const imgs = [...(p?.product_images ?? [])].sort((a: any, b: any) => a.sort_order - b.sort_order);
      return {
        variantId: v.id,
        sku: v.sku,
        variantName: v.name,
        productId: p?.id,
        productName: p?.name ?? "",
        productSlug: p?.slug ?? "",
        divisionId: p?.division_id,
        quantity: Number(inv?.quantity ?? 0),
        threshold: Number(inv?.low_stock_threshold ?? 3),
        isActive: v.is_active,
        image: imgs[0]?.url ?? null,
      };
    });
  }
  if (f.division) rows = rows.filter((r) => r.divisionId === f.division);
  if (f.stock === "low") rows = rows.filter((r) => r.quantity > 0 && r.quantity <= r.threshold);
  if (f.stock === "out") rows = rows.filter((r) => r.quantity === 0);
  if (f.stock === "alert") rows = rows.filter((r) => r.quantity <= r.threshold);
  if (f.q) {
    const t = f.q.toLowerCase();
    rows = rows.filter((r) => r.sku.toLowerCase().includes(t) || r.productName.toLowerCase().includes(t));
  }
  return rows;
}

export async function listLowStock(limit = 8) {
  const rows = await listInventory({ stock: "alert" });
  return rows.filter((r) => r.isActive).sort((a, b) => a.quantity - b.quantity).slice(0, limit);
}

export async function listMovements(f: { division?: string; reason?: string; variant?: string } = {}): Promise<MovementRow[]> {
  let rows: MovementRow[];
  if (isPreviewMode) {
    rows = previewMovements();
  } else {
    const sb = await createServerSupabase();
    let query = sb
      .from("inventory_movements")
      .select("id, variant_id, change, quantity_after, reason, note, created_at, actor:profiles(full_name), variant:product_variants(sku, product:products(name, division_id))")
      .order("created_at", { ascending: false })
      .limit(200);
    if (f.reason) query = query.eq("reason", f.reason);
    if (f.variant) query = query.eq("variant_id", f.variant);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows = (data ?? []).map((m: any) => {
      const v = one(m.variant);
      const p = one(v?.product);
      return {
        id: m.id,
        variantId: m.variant_id,
        sku: v?.sku ?? "",
        productName: p?.name ?? "",
        divisionId: p?.division_id ?? null,
        change: m.change,
        quantityAfter: m.quantity_after,
        reason: m.reason,
        note: m.note,
        actor: one(m.actor)?.full_name ?? null,
        createdAt: m.created_at,
      };
    });
  }
  if (f.division) rows = rows.filter((r) => r.divisionId === f.division);
  if (f.reason) rows = rows.filter((r) => r.reason === f.reason);
  if (f.variant) rows = rows.filter((r) => r.variantId === f.variant);
  return rows;
}
