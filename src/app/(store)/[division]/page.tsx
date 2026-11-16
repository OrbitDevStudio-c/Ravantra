import type { Metadata } from "next";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getCategories, getDivisionBySlug, getDivisions, listProducts } from "@/features/catalog/queries";
import { ProductListing, filtersFromSearchParams } from "@/components/products/product-listing";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { cn } from "@/lib/utils";

/**
 * One route serves every product division (Fashion, Beauty & Care, Lifestyle,
 * and any division added later from the admin) — no rebuild needed.
 * Salon & Spa (kind = services) has its own dedicated experience.
 */
const DEDICATED_ROUTES = new Set(["fashion"]);

export async function generateStaticParams() {
  const divisions = await getDivisions();
  // divisions with a dedicated storefront route (e.g. /fashion → AUREYA) are excluded
  return divisions.filter((d) => d.kind === "products" && !DEDICATED_ROUTES.has(d.slug)).map((d) => ({ division: d.slug }));
}

export async function generateMetadata({ params }: PageProps<"/[division]">): Promise<Metadata> {
  const { division: slug } = await params;
  const division = await getDivisionBySlug(slug);
  if (!division) return {};
  return {
    title: division.shortName,
    description: `${division.tagline} ${division.description}`,
    alternates: { canonical: `/${division.slug}` },
    openGraph: { title: `${division.name}`, description: division.description, images: [{ url: division.bannerImage }] },
  };
}

/**
 * Per-division temperature within the shared design system:
 * Beauty & Care → deep burgundy-plum + dusty rose · Lifestyle → obsidian + champagne gold.
 */
type Theme = { bg: string; text: string; sub: string; eyebrow: string; chip: string; chipActive: string; crumbs: "light" | "dark"; frame: string };
const BEAUTY: Theme = {
  bg: "bg-[color-mix(in_srgb,var(--color-burgundy)_18%,var(--color-night))]",
  text: "text-ink",
  sub: "text-ink-soft",
  eyebrow: "text-rose",
  chip: "border-white/20 text-ink hover:border-rose hover:text-rose",
  chipActive: "border-rose bg-rose !text-midnight",
  crumbs: "light",
  frame: "border-rose/35",
};
const THEMES: Record<string, Theme> = {
  beauty: BEAUTY,
  lifestyle: {
    bg: "bg-obsidian",
    text: "text-porcelain",
    sub: "text-porcelain/70",
    eyebrow: "text-gold",
    chip: "border-porcelain/25 text-porcelain/85 hover:border-gold hover:text-gold",
    chipActive: "border-gold bg-gold !text-midnight",
    crumbs: "light",
    frame: "border-gold/40",
  },
};

export default async function DivisionPage({ params, searchParams }: PageProps<"/[division]">) {
  const { division: slug } = await params;
  const division = await getDivisionBySlug(slug);
  if (!division || division.kind !== "products") notFound();

  const sp = await searchParams;
  const filters = filtersFromSearchParams(sp);
  const [categories, result, unfiltered] = await Promise.all([
    getCategories(division.id),
    listProducts({ ...filters, divisionId: division.id }),
    listProducts({ divisionId: division.id }),
  ]);
  const theme = THEMES[division.slug] ?? BEAUTY;
  const activeCat = categories.find((c) => c.slug === filters.categorySlug);
  const countFor = (catId: string) => unfiltered.products.filter((p) => p.categoryId === catId).length;

  return (
    <>
      <section data-division={division.slug} className={cn("relative overflow-hidden", theme.bg)}>
        <div className="container-lux grid items-stretch gap-0 lg:grid-cols-12">
          <div className={cn("flex min-w-0 flex-col justify-end py-14 lg:col-span-5 lg:py-20 lg:pr-10", theme.text)}>
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: division.shortName, href: `/${division.slug}` }, ...(activeCat ? [{ label: activeCat.name }] : [])]} tone={theme.crumbs} />
            <p className={cn("eyebrow mt-10 flex items-center gap-3", theme.eyebrow)}>
              <span className="h-px w-8 bg-current opacity-60" aria-hidden />
              RAVANTRA {division.shortName}
            </p>
            <h1 className="display display-lg mt-4">{activeCat ? activeCat.name : division.shortName}</h1>
            <p className={cn("mt-6 max-w-md text-[0.98rem] leading-relaxed", theme.sub)}>
              {activeCat?.description ?? division.description}
            </p>
            <div className="mt-10 flex flex-wrap gap-2">
              <Link
                href={`/${division.slug}`}
                aria-current={!activeCat ? "page" : undefined}
                className={cn("shrink-0 rounded-full border px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] transition-colors duration-300", theme.chip, !activeCat && theme.chipActive)}
              >
                All · {unfiltered.total}
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/${division.slug}?category=${c.slug}`}
                  aria-current={activeCat?.id === c.id ? "page" : undefined}
                  className={cn(
                    "shrink-0 rounded-full border px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] transition-colors duration-300",
                    theme.chip,
                    activeCat?.id === c.id && theme.chipActive,
                  )}
                >
                  {c.name} · {countFor(c.id)}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative -mx-[clamp(1rem,4vw,3.5rem)] aspect-[16/10] min-w-0 overflow-hidden lg:col-span-7 lg:mx-0 lg:-mr-[clamp(1rem,4vw,3.5rem)] lg:aspect-auto lg:min-h-[540px]">
            <Image
              src={activeCat?.image ?? division.bannerImage}
              alt=""
              fill
              priority
              sizes="(min-width:1024px) 58vw, 100vw"
              quality={65}
              className="mask-reveal object-cover"
            />
            <span className={cn("pointer-events-none absolute inset-4 hidden border lg:block", theme.frame)} aria-hidden />
          </div>
        </div>
      </section>

      <section data-division={division.slug} className="container-lux py-12 md:py-16">
        <ProductListing
          result={result}
          categories={categories.map((c) => ({ value: c.slug, label: c.name, count: countFor(c.id) }))}
          emptyHref={`/${division.slug}`}
        />
      </section>
    </>
  );
}
