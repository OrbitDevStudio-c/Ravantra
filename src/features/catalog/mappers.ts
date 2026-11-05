import type { Category, Division, Product, ProductVariant, Promotion, Review, Service, Stylist } from "@/types";

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

const num = (v: unknown) => (v == null ? null : Number(v));

export const DIVISION_COLUMNS =
  "id, slug, name, short_name, tagline, description, kind, accent_color, hero_image, banner_image, logo_url, sort_order, is_active";

export function mapDivision(r: Row): Division {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    shortName: r.short_name,
    tagline: r.tagline ?? "",
    description: r.description ?? "",
    kind: r.kind,
    accentColor: r.accent_color,
    heroImage: r.hero_image ?? "",
    bannerImage: r.banner_image ?? r.hero_image ?? "",
    logoUrl: r.logo_url,
    sortOrder: r.sort_order,
    isActive: r.is_active,
  };
}

export const CATEGORY_COLUMNS = "id, division_id, slug, name, description, image, sort_order, is_featured";

export function mapCategory(r: Row): Category {
  return {
    id: r.id,
    divisionId: r.division_id,
    slug: r.slug,
    name: r.name,
    description: r.description,
    image: r.image,
    sortOrder: r.sort_order,
    isFeatured: r.is_featured,
  };
}

export const PRODUCT_COLUMNS = `id, slug, name, division_id, category_id, sku, short_description, description, price, sale_price,
  ingredients, highlights, tags, is_featured, is_new, is_active, rating_avg, rating_count, created_at,
  product_images(id, url, alt, sort_order),
  product_variants(id, product_id, sku, name, size, color, color_hex, volume, price, sale_price, is_active, sort_order, inventory(quantity))`;

function variantStock(v: Row) {
  const inv = v.inventory;
  if (Array.isArray(inv)) return Number(inv[0]?.quantity ?? 0);
  return Number(inv?.quantity ?? 0);
}

export function mapVariant(v: Row): ProductVariant {
  return {
    id: v.id,
    productId: v.product_id,
    sku: v.sku,
    name: v.name,
    size: v.size,
    color: v.color,
    colorHex: v.color_hex,
    volume: v.volume,
    price: num(v.price),
    salePrice: num(v.sale_price),
    stock: variantStock(v),
    isActive: v.is_active,
  };
}

export function mapProduct(r: Row): Product {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    divisionId: r.division_id,
    categoryId: r.category_id,
    sku: r.sku,
    shortDescription: r.short_description ?? "",
    description: r.description ?? "",
    price: Number(r.price),
    salePrice: num(r.sale_price),
    ingredients: r.ingredients,
    highlights: r.highlights ?? [],
    tags: r.tags ?? [],
    isFeatured: r.is_featured,
    isNew: r.is_new,
    isActive: r.is_active,
    ratingAvg: Number(r.rating_avg ?? 0),
    ratingCount: Number(r.rating_count ?? 0),
    createdAt: r.created_at,
    images: [...(r.product_images ?? [])]
      .sort((a: Row, b: Row) => a.sort_order - b.sort_order)
      .map((i: Row) => ({ id: i.id, url: i.url, alt: i.alt ?? r.name, sortOrder: i.sort_order })),
    variants: [...(r.product_variants ?? [])]
      .sort((a: Row, b: Row) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map(mapVariant),
  };
}

export function mapReview(r: Row): Review {
  return {
    id: r.id,
    productId: r.product_id,
    authorName: r.author_name,
    rating: r.rating,
    title: r.title ?? "",
    body: r.body ?? "",
    isDemo: r.is_demo,
    createdAt: r.created_at,
  };
}

export function mapPromotion(r: Row): Promotion {
  return {
    id: r.id,
    title: r.title,
    subtitle: r.subtitle ?? "",
    eyebrow: r.eyebrow ?? "",
    ctaLabel: r.cta_label,
    ctaHref: r.cta_href,
    image: r.image ?? "",
    placement: r.placement,
    divisionId: r.division_id,
    startsAt: r.starts_at,
    endsAt: r.ends_at,
    isActive: r.is_active,
    sortOrder: r.sort_order,
  };
}

export const SERVICE_COLUMNS = "id, slug, category, name, description, duration_min, price, image, is_popular, is_active";

export function mapService(r: Row): Service {
  return {
    id: r.id,
    slug: r.slug,
    category: r.category,
    name: r.name,
    description: r.description ?? "",
    durationMin: r.duration_min,
    price: Number(r.price),
    image: r.image ?? "",
    isPopular: r.is_popular,
    isActive: r.is_active,
  };
}

export const STYLIST_COLUMNS =
  "id, slug, name, title, bio, image, specialties, experience_years, is_active, stylist_services(service_id), working_hours(weekday, start_time, end_time)";

export function mapStylist(r: Row): Stylist {
  return {
    id: r.id,
    slug: r.slug,
    name: r.name,
    title: r.title ?? "",
    bio: r.bio ?? "",
    image: r.image ?? "",
    specialties: r.specialties ?? [],
    experienceYears: r.experience_years ?? 0,
    isActive: r.is_active,
    serviceIds: (r.stylist_services ?? []).map((s: Row) => s.service_id),
    workingHours: (r.working_hours ?? []).map((w: Row) => ({
      weekday: w.weekday,
      startTime: String(w.start_time).slice(0, 5),
      endTime: String(w.end_time).slice(0, 5),
    })),
  };
}
