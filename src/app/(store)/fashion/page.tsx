import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getBestSellers, getCategories, getDivisionBySlug, getNewArrivals, getPromotions, listProducts } from "@/features/catalog/queries";
import { ProductListing, filtersFromSearchParams } from "@/components/products/product-listing";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import {
  AureyaBestSellers,
  AureyaCategories,
  AureyaCollections,
  AureyaEditorial,
  AureyaHero,
  AureyaNewArrivals,
  AureyaOccasion,
  AureyaPromises,
  AureyaWordmark,
} from "@/components/aureya/aureya-home";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { Category } from "@/types";

/**
 * AUREYA by RAVANTRA — the Fashion division's storefront.
 *  /fashion                   → brand home (hero, categories, shelves, editorial)
 *  /fashion?category=…|view=… → shop view (filters, sorting, category tree)
 * Everything here is read from the shared catalogue, so products, prices,
 * images, categories, variants, stock and collections are managed in /admin.
 */
const SLUG = "fashion";
const SHOP_KEYS = ["view", "category", "q", "sort", "size", "color", "min", "max", "new", "sale", "stock"];

export async function generateMetadata({ searchParams }: PageProps<"/fashion">): Promise<Metadata> {
  const division = await getDivisionBySlug(SLUG);
  const sp = await searchParams;
  const brand = division?.subBrand ?? "Fashion";
  const cat = typeof sp.category === "string" ? (await getCategories(division?.id)).find((c) => c.slug === sp.category) : undefined;
  return {
    title: cat ? `${cat.name} — ${brand}` : `${brand} — Women's Fashion`,
    description: cat?.description ?? `${division?.tagline ?? ""} ${division?.description ?? ""}`.trim(),
    alternates: { canonical: cat ? `/fashion?category=${cat.slug}` : "/fashion" },
    openGraph: { title: `${division?.name ?? brand}`, description: division?.description, images: division?.bannerImage ? [{ url: division.bannerImage }] : undefined },
  };
}

export default async function AureyaPage({ searchParams }: PageProps<"/fashion">) {
  const division = await getDivisionBySlug(SLUG);
  if (!division) notFound();
  const sp = await searchParams;
  const categories = await getCategories(division.id);
  const parents = categories.filter((c) => !c.parentId);
  const children = categories.filter((c) => c.parentId);

  const isShop = SHOP_KEYS.some((k) => sp[k] !== undefined);
  return isShop ? (
    <AureyaShop divisionId={division.id} sp={sp} parents={parents} childCats={children} />
  ) : (
    <AureyaHome divisionId={division.id} parents={parents} childCats={children} />
  );
}

/* ------------------------------------------------------------------ */

async function AureyaHome({ divisionId, parents, childCats }: { divisionId: string; parents: Category[]; childCats: Category[] }) {
  const division = (await getDivisionBySlug(SLUG))!;
  const [all, arrivals, best, promos, occasion] = await Promise.all([
    listProducts({ divisionId }),
    getNewArrivals(8, divisionId),
    getBestSellers(divisionId, 8),
    getPromotions(),
    listProducts({ divisionId, categorySlug: "occasion-wear" }),
  ]);

  const counts: Record<string, number> = {};
  for (const c of [...parents, ...childCats]) {
    counts[c.id] = all.products.filter((p) => p.categoryId === c.id || p.category.parentSlug === c.slug).length;
  }
  const collections = promos.filter((p) => p.placement === "division_collection" && p.divisionId === divisionId);
  const editorial = promos.find((p) => p.placement === "division_editorial" && p.divisionId === divisionId);
  const occasionParent = parents.find((p) => p.slug === "occasion-wear");

  return (
    <div className="bg-midnight">
      <AureyaHero division={division} spotlight={arrivals[0]} />
      <AureyaCategories parents={parents} subcategories={childCats} counts={counts} />
      <AureyaNewArrivals products={arrivals} />
      <AureyaCollections items={collections} />
      <AureyaBestSellers products={best} />
      <AureyaOccasion parent={occasionParent} subs={childCats.filter((c) => c.parentId === occasionParent?.id)} counts={counts} products={occasion.products} />
      <AureyaEditorial item={editorial} />
      <AureyaPromises />
    </div>
  );
}

/* ------------------------------------------------------------------ */

async function AureyaShop({
  divisionId,
  sp,
  parents,
  childCats,
}: {
  divisionId: string;
  sp: Record<string, string | string[] | undefined>;
  parents: Category[];
  childCats: Category[];
}) {
  const filters = filtersFromSearchParams(sp);
  const active = [...parents, ...childCats].find((c) => c.slug === filters.categorySlug);
  const activeParent = active ? (active.parentId ? parents.find((p) => p.id === active.parentId) : active) : undefined;
  const siblings = activeParent ? childCats.filter((c) => c.parentId === activeParent.id) : [];

  const [result, scopeAll] = await Promise.all([
    listProducts({ ...filters, divisionId }),
    listProducts({ divisionId, categorySlug: activeParent?.slug }),
  ]);
  const countIn = (c: Category) => scopeAll.products.filter((p) => p.categoryId === c.id || p.category.parentSlug === c.slug).length;
  const title = active?.name ?? (filters.q ? `Results for “${filters.q}”` : "The Collection");

  const tab = (href: string, label: string, on: boolean) => (
    <Link
      key={href}
      href={href}
      scroll={false}
      aria-current={on ? "page" : undefined}
      className={cn(
        "shrink-0 border-b-2 px-1 pb-3 text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition-colors duration-300",
        on ? "border-blush text-blush" : "border-transparent text-ink-soft hover:text-ink",
      )}
    >
      {label}
    </Link>
  );

  return (
    <>
      <section data-division="fashion" className="relative overflow-hidden bg-gold-soft">
        <div aria-hidden className="pointer-events-none absolute -right-24 -top-40 h-[460px] w-[340px] rounded-t-full border border-gold/30" />
        <div className="container-lux pb-0 pt-8">
          <Breadcrumbs
            items={[
              { label: "Home", href: "/" },
              { label: "AUREYA", href: "/fashion" },
              ...(activeParent && active && active.id !== activeParent.id ? [{ label: activeParent.name, href: `/fashion?category=${activeParent.slug}` }] : []),
              { label: title },
            ]}
          />
          <div className="mt-10 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <Link href="/fashion" aria-label="AUREYA home"><AureyaWordmark /></Link>
              <h1 className="display display-lg mt-6 text-ink">{title}</h1>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-ink-soft">
                {active?.description ?? "Timeless silhouettes, modern statements and heritage craft — the complete AUREYA wardrobe."}
              </p>
            </div>
          </div>
          <nav aria-label="AUREYA categories" className="no-scrollbar mt-10 flex gap-7 overflow-x-auto border-b border-blush/15">
            {tab("/fashion?view=all", "All", !activeParent)}
            {parents.map((p) => tab(`/fashion?category=${p.slug}`, p.name, activeParent?.id === p.id))}
          </nav>
          {siblings.length > 0 && (
            <div className="flex flex-wrap gap-2 py-5">
              <Link
                href={`/fashion?category=${activeParent!.slug}`}
                scroll={false}
                className={cn("rounded-full border px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] transition-colors duration-300", active?.id === activeParent!.id ? "border-burgundy bg-burgundy text-porcelain" : "border-blush/25 text-ink hover:border-blush")}
              >
                All {activeParent!.name}
              </Link>
              {siblings.map((s) => (
                <Link
                  key={s.id}
                  href={`/fashion?category=${s.slug}`}
                  scroll={false}
                  className={cn("rounded-full border px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] transition-colors duration-300", active?.id === s.id ? "border-burgundy bg-burgundy text-porcelain" : "border-blush/25 text-ink hover:border-blush")}
                >
                  {s.name} <span className="opacity-60">· {countIn(s)}</span>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      <section className="container-lux py-12 md:py-16">
        {scopeAll.total === 0 && activeParent ? (
          <div className="mx-auto max-w-lg py-16 text-center">
            <p className="eyebrow text-blush">Arriving soon</p>
            <p className="display mt-4 text-4xl">The {active?.name ?? activeParent.name} edit is on its way.</p>
            <p className="mt-4 text-sm text-ink-soft">Our atelier is finishing this collection. Explore what&apos;s available now.</p>
            <Button className="mt-8" asChild><Link href="/fashion?view=all">Shop the collection</Link></Button>
          </div>
        ) : (
          <ProductListing
            result={result}
            categories={(siblings.length ? siblings : parents).map((c) => ({ value: c.slug, label: c.name, count: countIn(c) }))}
            emptyHref={activeParent ? `/fashion?category=${activeParent.slug}` : "/fashion?view=all"}
          />
        )}
      </section>
    </>
  );
}
