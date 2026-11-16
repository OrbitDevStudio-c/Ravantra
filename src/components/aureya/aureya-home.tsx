import Link from "next/link";
import Image from "@/components/ui/smart-image";
import { Gem, RotateCcw, Scissors, Truck } from "lucide-react";
import type { Category, Division, ProductWithRelations, Promotion } from "@/types";
import { ProductCard } from "@/components/products/product-card";
import { ProductRail } from "@/components/home/product-rail";
import { Reveal } from "@/components/ui/reveal";
import { ArrowRight, Button } from "@/components/ui/button";
import { ArrowLink } from "@/components/ui/primitives";
import { productFromPrice } from "@/features/catalog/pricing";
import { cn, formatINR } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared bits                                                          */
/* ------------------------------------------------------------------ */

export function AureyaWordmark({ className, tone = "burgundy" }: { className?: string; tone?: "burgundy" | "ivory" }) {
  return (
    <span className={cn("inline-flex flex-col leading-none", className)}>
      <span className={cn("font-serif text-[1.65rem] font-medium tracking-[0.42em]", tone === "ivory" ? "text-porcelain" : "text-blush")}>AUREYA</span>
      <span className={cn("mt-1.5 text-[0.55rem] uppercase tracking-[0.42em]", tone === "ivory" ? "text-porcelain/60" : "text-gold")}>by RAVANTRA</span>
    </span>
  );
}

function AHeading({ eyebrow, title, action, light, className }: { eyebrow: string; title: React.ReactNode; action?: React.ReactNode; light?: boolean; className?: string }) {
  return (
    <div className={cn("flex flex-col gap-5 md:flex-row md:items-end md:justify-between", className)}>
      <div>
        <p className={cn("eyebrow flex items-center gap-3", light ? "text-gold" : "text-blush")}>
          <span className={cn("h-px w-8", light ? "bg-gold/60" : "bg-gold")} aria-hidden /> {eyebrow}
        </p>
        <h2 className={cn("display mt-4 text-[clamp(2.1rem,3.9vw,3.6rem)] leading-[1.02]", light ? "text-porcelain" : "text-ink")}>{title}</h2>
      </div>
      {action}
    </div>
  );
}

function ALink({ href, children, light }: { href: string; children: React.ReactNode; light?: boolean }) {
  return (
    <ArrowLink href={href} tone={light ? "dark" : "light"} className={light ? undefined : "text-blush hover:text-blush"}>
      {children}
    </ArrowLink>
  );
}

/* ------------------------------------------------------------------ */
/* Hero                                                                 */
/* ------------------------------------------------------------------ */

export function AureyaHero({ division, spotlight }: { division: Division; spotlight?: ProductWithRelations }) {
  const sp = spotlight ? productFromPrice(spotlight) : null;
  return (
    <section data-division="fashion" className="relative overflow-hidden bg-[var(--division-surface)]">
      {/* faint arch motif echoing the RAVANTRA emblem */}
      <div aria-hidden className="pointer-events-none absolute -left-40 top-24 hidden h-[640px] w-[420px] rounded-t-full border border-gold/25 lg:block" />
      <div className="container-lux grid items-center gap-12 pb-16 pt-10 lg:grid-cols-12 lg:gap-8 lg:pb-24 lg:pt-14">
        <div className="relative z-10 lg:col-span-6">
          <div className="animate-fade-up"><AureyaWordmark /></div>
          <p className="eyebrow mt-10 text-gold animate-fade-up [animation-delay:120ms]">{division.tagline || "Elegance in Every Thread."}</p>
          <h1 className="display display-xl mt-5 text-ink">
            <span className="line-in block overflow-hidden pb-[0.06em]"><span style={{ "--d": "150ms" } as React.CSSProperties}>A Style</span></span>
            <span className="line-in block overflow-hidden pb-[0.08em]">
              <span style={{ "--d": "280ms" } as React.CSSProperties}>
                That <em className="font-light italic text-gradient">Speaks.</em>
              </span>
            </span>
          </h1>
          <p className="mt-7 max-w-md text-[1.02rem] leading-relaxed text-ink-soft animate-fade-up [animation-delay:450ms]">
            Discover timeless silhouettes, modern statements and pieces that celebrate your individuality.
          </p>
          <div className="mt-10 flex flex-wrap gap-3 animate-fade-up [animation-delay:600ms]">
            <Button size="lg" asChild>
              <Link href="/fashion?view=all">Shop Collection <ArrowRight /></Link>
            </Button>
            <Button size="lg" variant="outline-brand" asChild>
              <Link href="/fashion?category=ethnic-wear">Explore Ethnic Wear</Link>
            </Button>
          </div>
          <ul className="mt-12 grid max-w-lg grid-cols-3 gap-4 border-t border-blush/15 pt-6 text-[0.68rem] uppercase tracking-[0.16em] text-ink-soft animate-fade-up [animation-delay:750ms]">
            <li>Handloom<br />partners</li>
            <li>Free<br />alterations</li>
            <li>Designed<br />in Mumbai</li>
          </ul>
        </div>

        <div className="relative lg:col-span-6">
          <div aria-hidden className="absolute -right-3 -top-3 hidden h-full w-[78%] rounded-t-full border border-gold/50 sm:block lg:right-2" />
          <div className="mask-reveal relative ml-auto aspect-[4/5] w-full overflow-hidden rounded-t-full bg-rose-soft sm:w-[78%]">
            <Image
              src={division.bannerImage || division.heroImage}
              alt="AUREYA campaign — the bridal edit"
              fill
              priority
              fetchPriority="high"
              sizes="(min-width:1024px) 40vw, 90vw"
              quality={72}
              className="object-cover object-top"
            />
          </div>
          {spotlight && sp && (
            <Link
              href={`/products/${spotlight.slug}`}
              className="group absolute bottom-6 left-0 flex w-[min(320px,85%)] items-center gap-4 bg-midnight/95 p-3 pr-5 shadow-[var(--shadow-float)] backdrop-blur animate-fade-up [animation-delay:900ms] sm:bottom-10"
            >
              <span className="relative aspect-[3/4] w-14 shrink-0 overflow-hidden bg-rose-soft">
                {spotlight.images[0] && <Image src={spotlight.images[0].url} alt="" fill sizes="56px" quality={55} className="object-cover" />}
              </span>
              <span className="min-w-0">
                <span className="eyebrow block text-[0.58rem] text-blush">Just arrived</span>
                <span className="mt-1 block truncate font-serif text-lg leading-tight">{spotlight.name}</span>
                <span className="text-sm text-ink-soft">{formatINR(sp.price)}</span>
              </span>
              <span aria-hidden className="ml-auto text-blush transition-transform duration-500 group-hover:translate-x-1">→</span>
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Categories — arched tiles                                            */
/* ------------------------------------------------------------------ */

export function AureyaCategories({ parents, subcategories, counts }: { parents: Category[]; subcategories: Category[]; counts: Record<string, number> }) {
  return (
    <section className="bg-midnight py-20 md:py-28">
      <div className="container-lux">
        <Reveal>
          <AHeading eyebrow="Shop by category" title={<>The AUREYA <em className="italic text-gradient">wardrobe</em></>} action={<ALink href="/fashion?view=all">View all</ALink>} />
        </Reveal>
        <div className="no-scrollbar -mx-[clamp(1rem,4vw,3.5rem)] mt-14 flex snap-x snap-mandatory gap-5 overflow-x-auto scroll-px-[clamp(1rem,4vw,3.5rem)] px-[clamp(1rem,4vw,3.5rem)] lg:mx-0 lg:grid lg:grid-cols-5 lg:overflow-visible lg:px-0">
          {parents.map((p, i) => {
            const subs = subcategories.filter((c) => c.parentId === p.id);
            const n = counts[p.id] ?? 0;
            return (
              <Reveal key={p.id} delay={i * 80} className="w-[62vw] shrink-0 snap-start sm:w-[40vw] lg:w-auto">
                <Link href={`/fashion?category=${p.slug}`} className="group block">
                  <div className="relative aspect-[3/4] overflow-hidden rounded-t-full bg-rose-soft">
                    {p.image && (
                      <Image src={p.image} alt={p.name} fill sizes="(min-width:1024px) 18vw, 60vw" quality={60} className="object-cover transition-transform duration-[1400ms] ease-[var(--ease-lux)] group-hover:scale-105" />
                    )}
                    <div className="absolute inset-0 rounded-t-full ring-1 ring-inset ring-gold/30" />
                    <span className="absolute left-1/2 top-6 -translate-x-1/2 font-serif text-sm italic text-porcelain drop-shadow">0{i + 1}</span>
                  </div>
                  <h3 className="mt-5 text-center font-serif text-[1.65rem] leading-none text-ink transition-colors group-hover:text-blush">{p.name}</h3>
                  <p className="mt-2 text-center text-[0.68rem] uppercase tracking-[0.14em] text-ink-mute">
                    {subs.map((s) => s.name).join(" · ")}
                  </p>
                  <p className="mt-2 text-center text-[0.7rem] text-blush">{n > 0 ? `${n} piece${n > 1 ? "s" : ""}` : "Arriving soon"}</p>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Product shelves                                                      */
/* ------------------------------------------------------------------ */

export function AureyaNewArrivals({ products }: { products: ProductWithRelations[] }) {
  if (!products.length) return null;
  return (
    <section className="border-t border-blush/10 bg-midnight py-20 md:py-28">
      <div className="container-lux">
        <Reveal>
          <AHeading eyebrow="Just landed" title={<>New <em className="italic text-gradient">arrivals</em></>} action={<ALink href="/fashion?view=all&sort=newest">Shop new in</ALink>} />
        </Reveal>
        <div className="mt-14">
          {products.length > 3 ? (
            <ProductRail label="New arrivals">
              {products.map((p) => (
                <div key={p.id} className="w-[64%] shrink-0 snap-start sm:w-[40%] lg:w-[23%]">
                  <ProductCard product={p} sizes="(min-width:1024px) 23vw, (min-width:640px) 40vw, 64vw" />
                </div>
              ))}
            </ProductRail>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6">
              {products.map((p) => <ProductCard key={p.id} product={p} />)}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

export function AureyaBestSellers({ products }: { products: ProductWithRelations[] }) {
  if (!products.length) return null;
  return (
    <section className="bg-midnight py-20 md:py-28">
      <div className="container-lux">
        <Reveal>
          <AHeading eyebrow="Most loved" title={<>Best <em className="italic text-gradient">sellers</em></>} />
        </Reveal>
        <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-14 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
          {products.map((p, i) => (
            <Reveal key={p.id} delay={(i % 4) * 80}>
              <p className="mb-3 flex items-baseline gap-2 font-serif text-blush">
                <span className="text-xs uppercase tracking-[0.2em]">No.</span>
                <span className="text-3xl leading-none">{String(i + 1).padStart(2, "0")}</span>
              </p>
              <ProductCard product={p} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Trending collections (admin → Marketing → "Division collection")     */
/* ------------------------------------------------------------------ */

export function AureyaCollections({ items }: { items: Promotion[] }) {
  if (!items.length) return null;
  const [first, ...rest] = items;
  return (
    <section className="bg-night py-20 md:py-28">
      <div className="container-lux">
        <Reveal>
          <AHeading eyebrow="Trending collections" title={<>Curated <em className="italic text-gradient">edits</em></>} />
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-2 lg:grid-cols-4 lg:grid-rows-2">
          {[first, ...rest].slice(0, 4).map((c, i) => (
            <Reveal key={c.id} delay={i * 90} className={cn(i === 0 && "md:row-span-2 lg:col-span-2")}>
              <Link href={c.ctaHref} className={cn("group relative block overflow-hidden bg-obsidian", i === 0 ? "aspect-[4/5] md:aspect-auto md:h-full md:min-h-[620px]" : "aspect-[4/3] lg:aspect-[4/5]")}>
                {c.image && (
                  <Image src={c.image} alt="" fill sizes={i === 0 ? "(min-width:1024px) 48vw, 100vw" : "(min-width:1024px) 24vw, (min-width:768px) 50vw, 100vw"} quality={62} className="object-cover opacity-90 transition-transform duration-[1400ms] ease-[var(--ease-lux)] group-hover:scale-105" />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-burgundy-deep/85 via-burgundy-deep/10 to-transparent" />
                <div className="absolute inset-x-6 bottom-6 text-porcelain">
                  <p className="eyebrow text-gold">{c.eyebrow}</p>
                  <h3 className={cn("mt-2 font-serif leading-none", i === 0 ? "text-[clamp(2.4rem,4vw,3.6rem)]" : "text-3xl")}>{c.title}</h3>
                  {i === 0 && <p className="mt-3 max-w-sm text-sm text-porcelain/80">{c.subtitle}</p>}
                  <span className="mt-4 inline-flex items-center gap-2 text-[0.68rem] uppercase tracking-[0.2em]">
                    {c.ctaLabel} <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Occasion wear                                                        */
/* ------------------------------------------------------------------ */

export function AureyaOccasion({ parent, subs, counts, products }: { parent?: Category; subs: Category[]; counts: Record<string, number>; products: ProductWithRelations[] }) {
  if (!parent) return null;
  return (
    <section className="relative overflow-hidden bg-burgundy text-porcelain">
      <div aria-hidden className="pointer-events-none absolute -right-32 -top-32 h-[520px] w-[520px] rounded-full border border-gold/20" />
      <div className="container-lux grid gap-14 py-20 md:py-28 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Reveal>
            <AHeading light eyebrow="Occasion wear" title={<>Dressed for <em className="italic text-gold">every celebration</em></>} />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-porcelain/75">{parent.description}</p>
          </Reveal>
          <ul className="mt-10 divide-y divide-porcelain/15 border-y border-porcelain/15">
            {subs.map((s) => (
              <li key={s.id}>
                <Link href={`/fashion?category=${s.slug}`} className="group flex items-center justify-between py-4">
                  <span className="font-serif text-2xl transition-transform duration-500 group-hover:translate-x-1">{s.name}</span>
                  <span className="text-[0.68rem] uppercase tracking-[0.18em] text-porcelain/60">{counts[s.id] ? `${counts[s.id]} pieces` : "Arriving soon"} →</span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-8"><ALink light href={`/fashion?category=${parent.slug}`}>Shop all occasion wear</ALink></div>
        </div>
        <div className="lg:col-span-8">
          {products.length > 0 ? (
            <div className="grid grid-cols-2 gap-4 md:grid-cols-3 md:gap-6">
              {products.slice(0, 3).map((p, i) => (
                <Reveal key={p.id} delay={i * 90} className="bg-midnight p-3 pb-5 text-ink">
                  <ProductCard product={p} sizes="(min-width:1024px) 20vw, 45vw" />
                </Reveal>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4">
              {subs.map((s) => (
                <div key={s.id} className="relative aspect-[3/4] overflow-hidden rounded-t-full bg-burgundy-deep">
                  {s.image && <Image src={s.image} alt="" fill sizes="25vw" quality={55} className="object-cover opacity-80" />}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Editorial banner (admin → Marketing → "Division editorial")          */
/* ------------------------------------------------------------------ */

export function AureyaEditorial({ item }: { item?: Promotion }) {
  if (!item) return null;
  return (
    <section className="relative isolate overflow-hidden bg-obsidian">
      <div className="absolute inset-0 -z-10">
        {item.image && <Image src={item.image} alt="" fill sizes="100vw" quality={65} className="object-cover object-[50%_30%]" />}
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/70 via-obsidian/20 to-transparent" />
      </div>
      <div className="container-lux flex min-h-[620px] items-center py-20">
        <Reveal className="max-w-lg bg-gold-soft/95 p-8 backdrop-blur md:p-12">
          <p className="eyebrow text-blush">{item.eyebrow}</p>
          <h2 className="display display-md mt-5 text-ink">{item.title}</h2>
          <p className="mt-5 text-sm leading-relaxed text-ink-soft">{item.subtitle}</p>
          <div className="mt-8"><ALink href={item.ctaHref}>{item.ctaLabel}</ALink></div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Promise strip                                                        */
/* ------------------------------------------------------------------ */

export function AureyaPromises() {
  const items = [
    { icon: Gem, title: "Heritage craft", body: "Handloom and hand-embroidered pieces from master artisans." },
    { icon: Scissors, title: "Free alterations", body: "Complimentary tailoring on occasion and bridal wear." },
    { icon: Truck, title: "Free shipping", body: "On orders above ₹2,999, dispatched in 24–48 hours." },
    { icon: RotateCcw, title: "Easy returns", body: "7-day returns on unworn pieces with tags." },
  ];
  return (
    <section className="border-t border-blush/10 bg-midnight py-14">
      <ul className="container-lux grid grid-cols-2 gap-8 lg:grid-cols-4">
        {items.map(({ icon: Icon, title, body }) => (
          <li key={title} className="flex gap-4">
            <span className="grid size-11 shrink-0 place-items-center rounded-full border border-blush/25 text-blush">
              <Icon className="size-4" strokeWidth={1.25} />
            </span>
            <span>
              <span className="block font-serif text-xl">{title}</span>
              <span className="mt-1 block text-xs leading-relaxed text-ink-soft">{body}</span>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
