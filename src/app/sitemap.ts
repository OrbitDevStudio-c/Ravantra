import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/env";
import { getAllProductSlugs, getDivisions } from "@/features/catalog/queries";
import { getServices } from "@/features/salon/queries";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [divisions, products, services] = await Promise.all([getDivisions(), getAllProductSlugs(), getServices()]);
  const now = new Date();
  const staticRoutes = ["", "/products", "/salon-spa", "/salon-spa/book", "/about", "/contact"].map((p) => ({
    url: `${SITE_URL}${p}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: p === "" ? 1 : 0.8,
  }));
  return [
    ...staticRoutes,
    ...divisions.filter((d) => d.kind === "products").map((d) => ({ url: `${SITE_URL}/${d.slug}`, lastModified: now, changeFrequency: "daily" as const, priority: 0.9 })),
    ...products.map((p) => ({ url: `${SITE_URL}/products/${p.slug}`, lastModified: new Date(p.updatedAt), changeFrequency: "weekly" as const, priority: 0.7 })),
    ...services.map((s) => ({ url: `${SITE_URL}/services/${s.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.6 })),
  ];
}
