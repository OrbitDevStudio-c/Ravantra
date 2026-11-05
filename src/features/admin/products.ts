import "server-only";
import * as demo from "@/config/demo-data";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapProduct, PRODUCT_COLUMNS } from "@/features/catalog/mappers";
import type { Product } from "@/types";
import { safeSearch } from "./common";

export interface ProductFilters {
  q?: string;
  division?: string;
  category?: string;
  status?: string;
  stock?: string;
  divisionScope?: string[] | null;
}

export async function listAdminProducts(f: ProductFilters): Promise<Product[]> {
  let rows: Product[];
  if (isPreviewMode) {
    rows = demo.products;
  } else {
    const sb = await createServerSupabase();
    let query = sb.from("products").select(PRODUCT_COLUMNS).order("created_at", { ascending: false }).limit(1000);
    if (f.division) query = query.eq("division_id", f.division);
    if (f.category) query = query.eq("category_id", f.category);
    const q = safeSearch(f.q);
    if (q) query = query.or(`name.ilike.%${q}%,sku.ilike.%${q}%`);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    rows = (data ?? []).map(mapProduct);
  }
  if (f.divisionScope) rows = rows.filter((p) => f.divisionScope!.includes(p.divisionId));
  if (f.division) rows = rows.filter((p) => p.divisionId === f.division);
  if (f.category) rows = rows.filter((p) => p.categoryId === f.category);
  if (f.status === "active") rows = rows.filter((p) => p.isActive);
  if (f.status === "inactive") rows = rows.filter((p) => !p.isActive);
  if (f.status === "featured") rows = rows.filter((p) => p.isFeatured);
  const stockOf = (p: Product) => p.variants.reduce((a, v) => a + v.stock, 0);
  if (f.stock === "out") rows = rows.filter((p) => stockOf(p) === 0);
  if (f.stock === "low") rows = rows.filter((p) => p.variants.some((v) => v.isActive && v.stock <= 3));
  if (isPreviewMode && f.q) {
    const t = f.q.toLowerCase();
    rows = rows.filter((p) => p.name.toLowerCase().includes(t) || p.sku.toLowerCase().includes(t));
  }
  return rows;
}

export async function getAdminProduct(id: string): Promise<Product | null> {
  if (isPreviewMode) return demo.products.find((p) => p.id === id) ?? null;
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("products").select(PRODUCT_COLUMNS).eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? mapProduct(data) : null;
}
