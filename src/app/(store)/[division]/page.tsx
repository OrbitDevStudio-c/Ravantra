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
export async function generateStaticParams() {
  const divisions = await getDivisions();
  return divisions.filter((d) => d.kind === "products").map((d) => ({ division: d.slug }));
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

/** Per-division tone within the shared design system */
const THEMES: Record<string, { bg: string; text: string; sub: string; chip: string }> = {
  fashion: { bg: "bg-espresso", text: "text-ivory", sub: "text-ivory/70", chip: "border-ivory/25 text-ivory/85 hover:bg-ivory hover:text-espresso" },
  beauty: { bg: "bg-[#EADBD3]", text: "text-espresso", sub: "text-ink-soft", chip: "border-espresso/20 hover:bg-espresso hover:text-ivory" },
  lifestyle: { bg: "bg-[#E9DFCF]", text: "text-espresso", sub: "text-ink-soft", chip: "border-espresso/20 hover:bg-espresso hover:text-ivory" },
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
  const theme = THEMES[division.slug] ?? { bg: "bg-champagne", text: "text-espresso", sub: "text-ink-soft", chip: "border-espresso/20 hover:bg-espresso hover:text-ivory" };
  const activeCat = categories.find((c) => c.slug === filters.categorySlug);
  const countFor = (catId: string) => unfiltered.products.filter((p) => p.categoryId === catId).length;

  return (
    <>
      <section className={cn("relative overflow-hidden", theme.bg)}>
        <div className="container-lux grid items-stretch gap-0 lg:grid-cols-12">
          <div className={cn("flex flex-col justify-end py-14 lg:col-span-5 lg:py-20", theme.text)}>
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: division.shortName, href: `/${division.slug}` }, ...(activeCat ? [{ label: activeCat.name }] : [])]} tone={division.slug === "fashion" ? "light" : "dark"} />
            <p className={cn("eyebrow mt-10", division.slug === "fashion" ? "text-gold" : "text-mocha")}>RAVANTRA {division.shortName}</p>
            <h1 className="display mt-4 text-[clamp(3rem,6.5vw,6rem)]">{activeCat ? activeCat.name : division.shortName}</h1>
            <p className={cn("mt-6 max-w-md text-[0.98rem] leading-relaxed", theme.sub)}>
              {activeCat?.description ?? division.description}
            </p>
            <div className="no-scrollbar -mx-4 mt-10 flex gap-2 overflow-x-auto px-4">
              <Link
                href={`/${division.slug}`}
                className={cn("shrink-0 border px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] transition", theme.chip, !activeCat && (division.slug === "fashion" ? "bg-ivory !text-espresso" : "bg-espresso !text-ivory"))}
              >
                All · {unfiltered.total}
              </Link>
              {categories.map((c) => (
                <Link
                  key={c.id}
                  href={`/${division.slug}?category=${c.slug}`}
                  className={cn(
                    "shrink-0 border px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] transition",
                    theme.chip,
                    activeCat?.id === c.id && (division.slug === "fashion" ? "bg-ivory !text-espresso" : "bg-espresso !text-ivory"),
                  )}
                >
                  {c.name} · {countFor(c.id)}
                </Link>
              ))}
            </div>
          </div>
          <div className="relative -mx-[clamp(1rem,4vw,3.5rem)] aspect-[16/10] lg:col-span-7 lg:mx-0 lg:-mr-[clamp(1rem,4vw,3.5rem)] lg:aspect-auto lg:min-h-[540px]">
            <Image
              src={activeCat?.image ?? division.bannerImage}
              alt=""
              fill
              priority
              sizes="(min-width:1024px) 58vw, 100vw"
              quality={65}
              className="mask-reveal object-cover"
            />
          </div>
        </div>
      </section>

      <section className="container-lux py-12 md:py-16">
        <ProductListing
          result={result}
          categories={categories.map((c) => ({ value: c.slug, label: c.name, count: countFor(c.id) }))}
          emptyHref={`/${division.slug}`}
        />
      </section>
    </>
  );
}
