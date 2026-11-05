import "server-only";
import { cache } from "react";
import { isPreviewMode } from "@/lib/env";
import { createPublicSupabase } from "@/lib/supabase/server";
import * as demo from "@/config/demo-data";
import type { Category, Division, Product, ProductWithRelations, Promotion, Review } from "@/types";
import {
  CATEGORY_COLUMNS,
  DIVISION_COLUMNS,
  PRODUCT_COLUMNS,
  mapCategory,
  mapDivision,
  mapProduct,
  mapPromotion,
  mapReview,
} from "./mappers";
import { productFromPrice, SIZE_ORDER } from "./pricing";

/* ------------------------------------------------------------------ */
/* Divisions & categories                                               */
/* ------------------------------------------------------------------ */

export const getDivisions = cache(async (): Promise<Division[]> => {
  if (isPreviewMode) return demo.divisions.filter((d) => d.isActive);
  const sb = createPublicSupabase();
  const { data, error } = await sb.from("business_divisions").select(DIVISION_COLUMNS).eq("is_active", true).order("sort_order");
  if (error) throw error;
  return (data ?? []).map(mapDivision);
});

export const getDivisionBySlug = cache(async (slug: string) => {
  const all = await getDivisions();
  return all.find((d) => d.slug === slug) ?? null;
});

export const getCategories = cache(async (divisionId?: string): Promise<Category[]> => {
  if (isPreviewMode) {
    return demo.categories.filter((c) => !divisionId || c.divisionId === divisionId);
  }
  const sb = createPublicSupabase();
  let query = sb.from("categories").select(CATEGORY_COLUMNS).eq("is_active", true).order("sort_order");
  if (divisionId) query = query.eq("division_id", divisionId);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map(mapCategory);
});

/* ------------------------------------------------------------------ */
/* Products                                                             */
/* ------------------------------------------------------------------ */

const allActiveProducts = cache(async (): Promise<Product[]> => {
  if (isPreviewMode) return demo.products.filter((p) => p.isActive);
  const sb = createPublicSupabase();
  const { data, error } = await sb
    .from("products")
    .select(PRODUCT_COLUMNS)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return (data ?? []).map(mapProduct);
});

async function withRelations(products: Product[]): Promise<ProductWithRelations[]> {
  const [divisions, categories] = await Promise.all([getDivisions(), getCategories()]);
  const dMap = new Map(divisions.map((d) => [d.id, d]));
  const cMap = new Map(categories.map((c) => [c.id, c]));
  return products
    .filter((p) => dMap.has(p.divisionId))
    .map((p) => {
      const d = dMap.get(p.divisionId)!;
      const c = cMap.get(p.categoryId);
      return {
        ...p,
        division: { id: d.id, slug: d.slug, name: d.name, shortName: d.shortName, accentColor: d.accentColor },
        category: { id: p.categoryId, slug: c?.slug ?? "", name: c?.name ?? "" },
      };
    });
}

export type ProductSort = "featured" | "newest" | "price-asc" | "price-desc" | "rating";

export interface ProductFilters {
  divisionId?: string;
  categorySlug?: string;
  q?: string;
  sort?: ProductSort;
  minPrice?: number;
  maxPrice?: number;
  sizes?: string[];
  colors?: string[];
  onlyNew?: boolean;
  onlySale?: boolean;
  inStock?: boolean;
}

export interface ProductListResult {
  products: ProductWithRelations[];
  total: number;
  facets: { sizes: string[]; colors: { name: string; hex: string | null }[]; priceMin: number; priceMax: number };
}

function normalise(s: string) {
  return s.toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "");
}

export async function listProducts(filters: ProductFilters = {}): Promise<ProductListResult> {
  let items = await withRelations(await allActiveProducts());
  if (filters.divisionId) items = items.filter((p) => p.divisionId === filters.divisionId);
  if (filters.categorySlug) items = items.filter((p) => p.category.slug === filters.categorySlug);

  if (filters.q) {
    const terms = normalise(filters.q).split(/\s+/).filter(Boolean);
    items = items.filter((p) => {
      const hay = normalise(
        [p.name, p.shortDescription, p.description, p.tags.join(" "), p.category.name, p.division.shortName].join(" "),
      );
      return terms.every((t) => hay.includes(t));
    });
  }

  // facets are computed before size/colour/price filters so options don't vanish
  const sizes = new Set<string>();
  const colors = new Map<string, string | null>();
  let priceMin = Infinity;
  let priceMax = 0;
  for (const p of items) {
    for (const v of p.variants) {
      if (v.size) sizes.add(v.size);
      if (v.color && !colors.has(v.color)) colors.set(v.color, v.colorHex);
    }
    const fp = productFromPrice(p).price;
    priceMin = Math.min(priceMin, fp);
    priceMax = Math.max(priceMax, fp);
  }

  if (filters.sizes?.length) items = items.filter((p) => p.variants.some((v) => v.size && filters.sizes!.includes(v.size)));
  if (filters.colors?.length) items = items.filter((p) => p.variants.some((v) => v.color && filters.colors!.includes(v.color)));
  if (filters.minPrice != null) items = items.filter((p) => productFromPrice(p).price >= filters.minPrice!);
  if (filters.maxPrice != null) items = items.filter((p) => productFromPrice(p).price <= filters.maxPrice!);
  if (filters.onlyNew) items = items.filter((p) => p.isNew);
  if (filters.onlySale) items = items.filter((p) => productFromPrice(p).compareAt != null);
  if (filters.inStock) items = items.filter((p) => p.variants.some((v) => v.stock > 0));

  const sort = filters.sort ?? "featured";
  items = [...items].sort((a, b) => {
    switch (sort) {
      case "newest":
        return +new Date(b.createdAt) - +new Date(a.createdAt);
      case "price-asc":
        return productFromPrice(a).price - productFromPrice(b).price;
      case "price-desc":
        return productFromPrice(b).price - productFromPrice(a).price;
      case "rating":
        return b.ratingAvg - a.ratingAvg || b.ratingCount - a.ratingCount;
      default:
        return Number(b.isFeatured) - Number(a.isFeatured) || +new Date(b.createdAt) - +new Date(a.createdAt);
    }
  });

  const sizeList = [...sizes].sort((a, b) => {
    const ia = SIZE_ORDER.indexOf(a);
    const ib = SIZE_ORDER.indexOf(b);
    if (ia === -1 && ib === -1) return a.localeCompare(b);
    if (ia === -1) return 1;
    if (ib === -1) return -1;
    return ia - ib;
  });

  return {
    products: items,
    total: items.length,
    facets: {
      sizes: sizeList,
      colors: [...colors].map(([name, hex]) => ({ name, hex })),
      priceMin: Number.isFinite(priceMin) ? priceMin : 0,
      priceMax,
    },
  };
}

export const getProductBySlug = cache(async (slug: string): Promise<ProductWithRelations | null> => {
  const all = await withRelations(await allActiveProducts());
  return all.find((p) => p.slug === slug) ?? null;
});

export async function getFeaturedProducts(limit = 8) {
  const all = await withRelations(await allActiveProducts());
  // interleave divisions so the edit feels curated, not grouped
  const featured = all.filter((p) => p.isFeatured);
  const byDiv = new Map<string, ProductWithRelations[]>();
  featured.forEach((p) => byDiv.set(p.divisionId, [...(byDiv.get(p.divisionId) ?? []), p]));
  const out: ProductWithRelations[] = [];
  while (out.length < limit && [...byDiv.values()].some((l) => l.length)) {
    for (const list of byDiv.values()) {
      const next = list.shift();
      if (next && out.length < limit) out.push(next);
    }
  }
  return out;
}

export async function getNewArrivals(limit = 10) {
  const all = await withRelations(await allActiveProducts());
  return [...all].sort((a, b) => Number(b.isNew) - Number(a.isNew) || +new Date(b.createdAt) - +new Date(a.createdAt)).slice(0, limit);
}

export async function getRelatedProducts(product: Product, limit = 4) {
  const all = await withRelations(await allActiveProducts());
  const same = all.filter((p) => p.id !== product.id && p.categoryId === product.categoryId);
  const div = all.filter((p) => p.id !== product.id && p.divisionId === product.divisionId && p.categoryId !== product.categoryId);
  return [...same, ...div].slice(0, limit);
}

export async function getProductsByIds(ids: string[]) {
  if (!ids.length) return [];
  const all = await withRelations(await allActiveProducts());
  const set = new Set(ids);
  return all.filter((p) => set.has(p.id));
}

export async function getAllProductSlugs() {
  const all = await allActiveProducts();
  return all.map((p) => ({ slug: p.slug, updatedAt: p.createdAt }));
}

/* ------------------------------------------------------------------ */
/* Reviews & promotions                                                 */
/* ------------------------------------------------------------------ */

export const getProductReviews = cache(async (productId: string): Promise<Review[]> => {
  if (isPreviewMode) return demo.reviews.filter((r) => r.productId === productId);
  const sb = createPublicSupabase();
  const { data, error } = await sb
    .from("reviews")
    .select("id, product_id, author_name, rating, title, body, is_demo, created_at")
    .eq("product_id", productId)
    .eq("is_published", true)
    .order("created_at", { ascending: false })
    .limit(30);
  if (error) throw error;
  return (data ?? []).map(mapReview);
});

/** Top-rated reviews, used as homepage testimonials */
export async function getTestimonials(limit = 6) {
  let rows: Review[];
  if (isPreviewMode) {
    rows = demo.reviews;
  } else {
    const sb = createPublicSupabase();
    const { data, error } = await sb
      .from("reviews")
      .select("id, product_id, author_name, rating, title, body, is_demo, created_at")
      .eq("is_published", true)
      .gte("rating", 5)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    rows = (data ?? []).map(mapReview);
  }
  const products = await getProductsByIds(rows.map((r) => r.productId));
  const pMap = new Map(products.map((p) => [p.id, p]));
  return rows
    .filter((r) => r.rating >= 5 && r.body.length > 60 && pMap.has(r.productId))
    .slice(0, limit)
    .map((r) => ({ ...r, product: pMap.get(r.productId)! }));
}

export const getPromotions = cache(async (placement?: Promotion["placement"]): Promise<Promotion[]> => {
  let rows: Promotion[];
  if (isPreviewMode) {
    rows = demo.promotions.filter((p) => p.isActive);
  } else {
    const sb = createPublicSupabase();
    const { data, error } = await sb
      .from("promotions")
      .select("id, eyebrow, title, subtitle, cta_label, cta_href, image, placement, division_id, starts_at, ends_at, is_active, sort_order")
      .eq("is_active", true)
      .order("sort_order");
    if (error) throw error;
    rows = (data ?? []).map(mapPromotion);
  }
  return placement ? rows.filter((p) => p.placement === placement) : rows;
});
