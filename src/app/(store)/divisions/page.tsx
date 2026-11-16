import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/ui/smart-image";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ArrowRight, Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { getCategories, getDivisions, listProducts } from "@/features/catalog/queries";
import { getServices, getStylists } from "@/features/salon/queries";
import { cn } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Our houses",
  description: "Fashion, Beauty & Care, Salon & Spa and Lifestyle — explore the four houses of RAVANTRA in one place.",
  alternates: { canonical: "/divisions" },
};

/** Accent text per division, on the shared dark system. */
const ACCENT: Record<string, string> = {
  fashion: "text-blush",
  beauty: "text-rose",
  "salon-spa": "text-sage-light",
  lifestyle: "text-gold",
};

export default async function DivisionsPage() {
  const [divisions, categories, all, services, stylists] = await Promise.all([
    getDivisions(),
    getCategories(),
    listProducts(),
    getServices(),
    getStylists(),
  ]);
  const serviceCategories = [...new Set(services.map((s) => s.category))];

  const houses = divisions.map((d) => {
    const isSalon = d.kind === "services";
    const href = isSalon ? "/salon-spa" : `/${d.slug}`;
    const count = isSalon ? services.length : all.products.filter((p) => p.divisionId === d.id).length;
    return {
      ...d,
      href,
      title: d.subBrand ?? d.shortName,
      label: d.subBrand ? `${d.shortName} · by RAVANTRA` : d.shortName,
      image: d.bannerImage || d.heroImage,
      accent: ACCENT[d.slug] ?? "text-blush",
      facts: isSalon
        ? [
            { value: String(count).padStart(2, "0"), label: "Services" },
            { value: String(stylists.length).padStart(2, "0"), label: "Specialists" },
          ]
        : [
            { value: String(count).padStart(2, "0"), label: count === 1 ? "Piece" : "Pieces" },
            { value: String(categories.filter((c) => c.divisionId === d.id && !c.parentId).length).padStart(2, "0"), label: "Categories" },
          ],
      links: isSalon
        ? serviceCategories.map((c) => ({ label: c, href: `/salon-spa?category=${encodeURIComponent(c)}#services` }))
        : categories.filter((c) => c.divisionId === d.id && !c.parentId).map((c) => ({ label: c.name, href: `${href}?category=${c.slug}` })),
      primary: isSalon ? { label: "Book an appointment", href: "/salon-spa/book" } : { label: `Shop ${d.subBrand ?? d.shortName}`, href },
      secondary: isSalon ? { label: "View the menu", href: "/salon-spa#services" } : { label: "New in", href: `${href}?sort=newest` },
    };
  });

  return (
    <>
      {/* Intro */}
      <section className="container-lux pb-14 pt-8 md:pb-20 md:pt-10">
        <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Our houses" }]} />
        <div className="mt-10 grid items-end gap-10 lg:grid-cols-12">
          <div className="lg:col-span-8">
            <Eyebrow className="flex items-center gap-3">
              <span className="h-px w-10 bg-gold" aria-hidden /> The house of RAVANTRA
            </Eyebrow>
            <h1 className="display mt-6 text-[clamp(2.8rem,6.6vw,6.25rem)]">
              Four houses. <em className="text-gradient italic">One world of your own.</em>
            </h1>
          </div>
          <p className="max-w-md text-[1.02rem] leading-[1.75] text-ink-soft lg:col-span-4">
            What you wear, how you care for yourself, the hour you take, the things you keep — each has its own house here, run by its own specialists, with one bag and one account across all of them.
          </p>
        </div>

        {/* Jump links */}
        <nav aria-label="Jump to a house" className="mt-12 grid grid-cols-2 border-t border-line md:grid-cols-4">
          {houses.map((h, i) => (
            <a key={h.id} href={`#${h.slug}`} className="group flex items-baseline gap-3 border-b border-line py-5 pr-4 transition-colors md:border-b-0 md:border-r md:pl-5 md:first:pl-0 md:last:border-r-0">
              <span className="font-serif text-sm italic text-gold">0{i + 1}</span>
              <span className="link-u font-serif text-[1.35rem] leading-none text-ink-soft transition-colors group-hover:text-white">{h.title}</span>
            </a>
          ))}
        </nav>
      </section>

      {/* One chapter per house, alternating sides */}
      {houses.map((h, i) => {
        const flip = i % 2 === 1;
        return (
          <section key={h.id} id={h.slug} data-division={h.slug} className="scroll-mt-20 border-t border-line bg-[var(--division-surface)]">
            <div className="container-lux grid gap-x-12 gap-y-10 py-[var(--space-section-sm)] lg:grid-cols-12 lg:items-center xl:gap-x-20">
              <Reveal variant="mask" className={cn("relative aspect-[4/5] overflow-hidden bg-plum sm:aspect-[5/4] lg:col-span-6 lg:aspect-[4/5]", flip && "lg:order-2")}>
                <Link href={h.href} className="group img-zoom absolute inset-0 block" aria-label={`Explore ${h.title}`}>
                  <Image src={h.image} alt="" fill priority={i === 0} sizes="(min-width:1024px) 46vw, 100vw" quality={70} className="object-cover object-[50%_22%]" />
                  <span className="absolute inset-0 bg-gradient-to-t from-midnight/55 via-transparent to-transparent" aria-hidden />
                  <span className="pointer-events-none absolute inset-3 border border-white/20 transition-colors duration-700 group-hover:border-gold/60" aria-hidden />
                  <span className="absolute left-7 top-6 font-serif text-[2.5rem] italic leading-none text-white/90">0{i + 1}</span>
                </Link>
              </Reveal>

              <div className={cn("lg:col-span-6", flip && "lg:order-1")}>
                <Reveal>
                  <p className={cn("eyebrow", h.accent)}>{h.label}</p>
                  <h2 className={cn("display mt-5 text-[clamp(2.6rem,5vw,4.75rem)]", h.subBrand && "tracking-[0.14em]")}>{h.title}</h2>
                  <p className="mt-5 max-w-xl font-serif text-[1.6rem] italic leading-snug text-ink-soft">{h.tagline}</p>
                  <p className="mt-5 max-w-xl leading-[1.75] text-ink-soft">{h.description}</p>
                </Reveal>

                <Reveal delay={90}>
                  <dl className="mt-9 flex gap-10 border-t border-line pt-6">
                    {h.facts.map((f) => (
                      <div key={f.label}>
                        <dd className="font-serif text-[2.4rem] leading-none tabular-nums text-ink">{f.value}</dd>
                        <dt className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-ink-mute">{f.label}</dt>
                      </div>
                    ))}
                  </dl>
                </Reveal>

                {h.links.length > 0 && (
                  <Reveal delay={150}>
                    <ul className="mt-8 flex flex-wrap gap-2" aria-label={`${h.title} categories`}>
                      {h.links.map((l) => (
                        <li key={l.href}>
                          <Link
                            href={l.href}
                            className="inline-block rounded-full border border-line-strong px-4 py-2 text-[0.72rem] font-medium uppercase tracking-[0.14em] text-ink-soft transition-colors duration-300 hover:border-white hover:text-white"
                          >
                            {l.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </Reveal>
                )}

                <Reveal delay={210}>
                  <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4">
                    <Button size="lg" asChild>
                      <Link href={h.primary.href}>
                        {h.primary.label} <ArrowRight />
                      </Link>
                    </Button>
                    <Link href={h.secondary.href} className="group inline-flex items-center gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:text-blush">
                      <span className="link-u">{h.secondary.label}</span>
                      <ArrowRight />
                    </Link>
                  </div>
                </Reveal>
              </div>
            </div>
          </section>
        );
      })}

      {/* Closing band */}
      <section className="border-t border-line bg-night">
        <div className="container-narrow py-[var(--space-section-sm)] text-center">
          <p className="ornament mx-auto max-w-xs">
            <span className="eyebrow shrink-0 text-gold">One house</span>
          </p>
          <p className="display display-md mx-auto mt-7 max-w-3xl">
            Shop every house with <em className="text-gradient italic">one bag</em> and one checkout.
          </p>
          <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
            <Button size="lg" asChild>
              <Link href="/products">
                Shop everything <ArrowRight />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/about">Our story</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
