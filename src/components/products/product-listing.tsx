import { Suspense } from "react";
import Link from "next/link";
import type { ProductListResult, ProductFilters, ProductSort } from "@/features/catalog/queries";
import { ProductCard } from "./product-card";
import { ActiveFilters, FiltersSheetButton, FiltersSidebar, SortSelect, type FilterOption } from "./product-filters";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { LoadMoreGrid } from "./load-more-grid";

type SP = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

/** Parse URL search params into typed product filters. */
export function filtersFromSearchParams(sp: SP): ProductFilters {
  const list = (k: string) => (one(sp[k]) ?? "").split(",").map((s) => s.trim()).filter(Boolean).slice(0, 20);
  const numOrUndef = (k: string) => {
    const n = Number(one(sp[k]));
    return Number.isFinite(n) && n > 0 ? n : undefined;
  };
  const sort = one(sp.sort);
  return {
    categorySlug: one(sp.category)?.slice(0, 80),
    q: one(sp.q)?.slice(0, 60),
    sort: (["featured", "newest", "price-asc", "price-desc", "rating"].includes(sort ?? "") ? sort : "featured") as ProductSort,
    minPrice: numOrUndef("min"),
    maxPrice: numOrUndef("max"),
    sizes: list("size"),
    colors: list("color"),
    onlyNew: one(sp.new) === "1",
    onlySale: one(sp.sale) === "1",
    inStock: one(sp.stock) === "1",
  };
}

export function ProductListing({
  result,
  categories,
  divisions,
  emptyHref = "/products",
}: {
  result: ProductListResult;
  categories?: FilterOption[];
  divisions?: FilterOption[];
  emptyHref?: string;
}) {
  return (
    <div className="grid gap-10 lg:grid-cols-[240px_1fr] xl:gap-14">
      <Suspense>
        <FiltersSidebar facets={result.facets} categories={categories} divisions={divisions} />
      </Suspense>
      <div>
        <div className="sticky top-16 z-20 -mx-[clamp(1rem,4vw,3.5rem)] mb-8 flex items-center justify-between gap-4 border-b border-line bg-midnight/95 px-[clamp(1rem,4vw,3.5rem)] py-3 backdrop-blur lg:static lg:mx-0 lg:bg-transparent lg:px-0 lg:pb-4 lg:pt-0 lg:backdrop-blur-none">
          <div className="flex items-center gap-4">
            <Suspense>
              <FiltersSheetButton facets={result.facets} categories={categories} divisions={divisions} total={result.total} />
            </Suspense>
            <p className="text-xs text-ink-mute" aria-live="polite">
              <span className="font-semibold text-ink tabular-nums">{result.total}</span> {result.total === 1 ? "piece" : "pieces"}
            </p>
          </div>
          <Suspense>
            <SortSelect />
          </Suspense>
        </div>
        <Suspense>
          <div className="mb-6">
            <ActiveFilters />
          </div>
        </Suspense>
        {result.products.length === 0 ? (
          <EmptyState
            title="Nothing matches — yet"
            description="Try removing a filter or searching for something broader."
            action={
              <Button variant="outline" asChild>
                <Link href={emptyHref}>Clear filters</Link>
              </Button>
            }
          />
        ) : (
          <LoadMoreGrid
            key={result.products.map((p) => p.id).join(",")}
            pageSize={12}
            className="grid grid-cols-2 gap-x-3 gap-y-12 sm:gap-x-4 md:grid-cols-3 md:gap-x-6"
          >
            {result.products.map((p, i) => (
              <ProductCard key={p.id} product={p} priority={i < 3} sizes="(min-width:1280px) 26vw, (min-width:768px) 30vw, 48vw" />
            ))}
          </LoadMoreGrid>
        )}
      </div>
    </div>
  );
}
