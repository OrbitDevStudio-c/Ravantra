import type { Metadata } from "next";
import { getCategories, getDivisions, listProducts } from "@/features/catalog/queries";
import { ProductListing, filtersFromSearchParams } from "@/components/products/product-listing";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export async function generateMetadata({ searchParams }: PageProps<"/products">): Promise<Metadata> {
  const sp = await searchParams;
  const q = typeof sp.q === "string" ? sp.q : undefined;
  return {
    title: q ? `Search: ${q}` : "Shop all",
    description: "Shop the full RAVANTRA edit — fashion, beauty & care and lifestyle in one place.",
    alternates: { canonical: "/products" },
    robots: q ? { index: false, follow: true } : undefined,
  };
}

export default async function ProductsPage({ searchParams }: PageProps<"/products">) {
  const sp = await searchParams;
  const filters = filtersFromSearchParams(sp);
  const divisionSlug = typeof sp.division === "string" ? sp.division : undefined;
  const divisions = (await getDivisions()).filter((d) => d.kind === "products");
  const division = divisions.find((d) => d.slug === divisionSlug);

  const [result, all, categories] = await Promise.all([
    listProducts({ ...filters, divisionId: division?.id }),
    listProducts({ q: filters.q }),
    getCategories(division?.id),
  ]);

  const title = filters.q ? `Results for “${filters.q}”` : division ? division.shortName : "The full edit";

  return (
    <div className="container-lux pb-20 pt-10">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Shop", href: "/products" }, ...(filters.q ? [{ label: "Search" }] : [])]} />
      <header className="mb-12 mt-8 flex flex-col gap-4 border-b border-line pb-10 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="eyebrow text-mocha">{filters.q ? "Search" : "Shop all"}</p>
          <h1 className="display mt-3 text-[clamp(2.6rem,5.5vw,5rem)]">{title}</h1>
        </div>
        <p className="max-w-sm text-sm text-ink-soft">
          Fashion, beauty &amp; care and lifestyle — shop across every RAVANTRA division with a single bag and a single checkout.
        </p>
      </header>
      <ProductListing
        result={result}
        divisions={divisions.map((d) => ({ value: d.slug, label: d.shortName, count: all.products.filter((p) => p.divisionId === d.id).length }))}
        categories={division ? categories.map((c) => ({ value: c.slug, label: c.name })) : undefined}
      />
    </div>
  );
}
