import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { ArrowLink, SectionHeading } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { BEAUTY_IMG, FASHION_IMG, img } from "@/config/demo-data";
import { cn } from "@/lib/utils";
import type { Division, ProductWithRelations } from "@/types";
import { ProductCard } from "@/components/products/product-card";

const PILLARS = [
  { n: "01", title: "Craft", body: "Made with ateliers and artisans across India — from Varanasi looms to Kannauj attar." },
  { n: "02", title: "Care", body: "Clean formulations and senior specialists, never rushed and never generic." },
  { n: "03", title: "Ritual", body: "Salon and spa hours designed as a pause, booked in under a minute." },
  { n: "04", title: "Keepsake", body: "Objects with a long life — chosen to be worn, gifted and passed on." },
];

/** Quiet brand introduction between the hero and the division panels. */
export function BrandIntro() {
  return (
    <section className="section-sm border-y border-line bg-plum/45">
      <div className="container-lux">
        <Reveal className="mx-auto max-w-3xl text-center">
          <p className="ornament mx-auto max-w-xs">
            <span className="eyebrow shrink-0 text-gold">The house of RAVANTRA</span>
          </p>
          <p className="display display-sm mt-7 text-ink">
            A modern Indian house for the way you dress, care for yourself and take time —{" "}
            <em className="italic text-gradient">held to one standard of craft.</em>
          </p>
        </Reveal>
        <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-10 md:mt-16 lg:grid-cols-4 lg:gap-x-10">
          {PILLARS.map((p, i) => (
            <Reveal key={p.title} delay={i * 90} className="border-t border-line-strong pt-5">
              <dt className="flex items-baseline gap-3">
                <span className="font-serif text-sm italic text-gold">{p.n}</span>
                <span className="font-serif text-[1.45rem] leading-none text-ink">{p.title}</span>
              </dt>
              <dd className="mt-3 text-[0.86rem] leading-[1.7] text-ink-soft">{p.body}</dd>
            </Reveal>
          ))}
        </dl>
      </div>
    </section>
  );
}

type Tile = { href: string; image: string; eyebrow: string; title: string; position?: string; className?: string; sizes: string };

const TILES: Tile[] = [
  {
    href: "/fashion?category=ethnic-wear",
    image: FASHION_IMG.lehenga,
    eyebrow: "AUREYA · Ethnic",
    title: "The Festive Edit",
    position: "object-[50%_25%]",
    sizes: "(min-width:1024px) 56vw, 100vw",
  },
  {
    href: "/fashion?category=occasion-wear",
    image: FASHION_IMG.crystalGown,
    eyebrow: "AUREYA · Occasion",
    title: "After Dark",
    position: "object-[50%_20%]",
    sizes: "(min-width:1024px) 40vw, 100vw",
  },
  {
    href: "/fashion?category=western-wear",
    image: FASHION_IMG.drapedCoord,
    eyebrow: "AUREYA · Western",
    title: "Modern Separates",
    position: "object-[50%_25%]",
    sizes: "(min-width:1024px) 40vw, 50vw",
  },
];

const SMALL: Tile[] = [
  {
    href: "/beauty?category=skincare",
    image: BEAUTY_IMG.makeup,
    eyebrow: "Beauty & Care",
    title: "Daily Rituals",
    sizes: "(min-width:1024px) 22vw, 50vw",
  },
  {
    href: "/lifestyle?category=jewellery",
    image: img("1515562141207-7a88fb7ce338", 900),
    eyebrow: "Lifestyle",
    title: "Heirloom Jewellery",
    sizes: "(min-width:1024px) 22vw, 50vw",
  },
];

function CollectionTile({ t, large, compact }: { t: Tile; large?: boolean; compact?: boolean }) {
  return (
    <Link href={t.href} data-cursor="View" className={cn("group img-zoom relative block overflow-hidden bg-rose-soft", t.className)}>
      <Image src={t.image} alt="" fill sizes={t.sizes} quality={65} className={cn("object-cover", t.position)} />
      <span className="absolute inset-0 bg-gradient-to-t from-obsidian/70 via-obsidian/5 to-transparent transition-opacity duration-700 group-hover:opacity-90" aria-hidden />
      <span className="border-gradient pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-700 group-hover:opacity-100" aria-hidden />
      <span className="absolute inset-x-5 bottom-5 flex items-end justify-between gap-4 text-porcelain transition-transform duration-700 ease-[var(--ease-lux)] group-hover:-translate-y-1.5 md:inset-x-7 md:bottom-7">
        <span>
          <span className="eyebrow block text-gold">{t.eyebrow}</span>
          <span className={cn("mt-2 block font-serif leading-[1.02]", large ? "text-[clamp(2rem,3.6vw,3.25rem)]" : compact ? "text-[clamp(1.2rem,1.5vw,1.45rem)]" : "text-[clamp(1.5rem,2.2vw,2rem)]")}>{t.title}</span>
        </span>
        <span
          aria-hidden
          className={cn(
            "grid size-10 shrink-0 place-items-center rounded-full border border-porcelain/50 transition-[background-color,color,transform] duration-500 group-hover:-translate-y-0.5 group-hover:bg-white group-hover:text-midnight",
            compact && "hidden",
          )}
        >
          →
        </span>
      </span>
    </Link>
  );
}

/** Asymmetrical editorial grid of featured collections. */
export function FeaturedCollections({ index }: { index?: string }) {
  return (
    <section className="section">
      <div className="container-lux">
        <Reveal>
          <SectionHeading
            index={index}
            eyebrow="Featured collections"
            title={
              <>
                Dressed for <em className="italic text-gradient">every chapter</em>
              </>
            }
            action={<ArrowLink href="/fashion">Shop AUREYA</ArrowLink>}
          />
        </Reveal>
        <div className="mt-12 grid grid-cols-1 gap-3 sm:grid-cols-2 md:mt-14 lg:grid-cols-12 lg:grid-rows-[auto_1fr] lg:gap-4">
          <Reveal variant="mask" className="sm:col-span-2 lg:col-span-7 lg:row-span-2">
            <CollectionTile t={{ ...TILES[0], className: "aspect-[4/5] lg:aspect-auto lg:h-full lg:min-h-[640px]" }} large />
          </Reveal>
          <Reveal variant="mask" delay={120} className="sm:col-span-2 lg:col-span-5">
            <CollectionTile t={{ ...TILES[1], className: "aspect-[4/3] lg:aspect-[16/10]" }} />
          </Reveal>
          <div className="grid grid-cols-2 gap-3 sm:col-span-2 lg:col-span-5 lg:gap-4">
            <Reveal variant="mask" delay={200}>
              <CollectionTile t={{ ...TILES[2], className: "aspect-[3/4] h-full lg:aspect-auto lg:min-h-[316px]" }} />
            </Reveal>
            <div className="grid gap-3 lg:gap-4">
              {SMALL.map((t, i) => (
                <Reveal variant="mask" key={t.href} delay={280 + i * 80}>
                  <CollectionTile compact t={{ ...t, className: "aspect-[4/3] lg:aspect-auto lg:h-full lg:min-h-[150px]" }} />
                </Reveal>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * A division's edit on the homepage: one tall editorial image beside a short
 * run of its products. Takes the division's own surface temperature via
 * [data-division]; `flip` mirrors the layout so consecutive edits don't repeat.
 */
export function DivisionEdit({
  division,
  products,
  index,
  eyebrow,
  title,
  description,
  cta,
  caption,
  flip,
}: {
  division: Division;
  products: ProductWithRelations[];
  index?: string;
  eyebrow: string;
  title: React.ReactNode;
  description?: string;
  cta: string;
  caption: string;
  flip?: boolean;
}) {
  if (products.length === 0) return null;
  const href = `/${division.slug}`;
  return (
    <section data-division={division.slug} className={cn("section relative bg-[var(--division-surface)]", division.slug === "beauty" && "glow-blush")}>
      <div className="container-lux grid gap-x-10 gap-y-12 lg:grid-cols-12 lg:items-stretch xl:gap-x-16">
        {/* Beauty drifts softly; lifestyle carries a slow scroll parallax — one personality each */}
        <div className={cn("lg:col-span-5", flip && "lg:order-2", division.slug === "beauty" ? "float-soft-slow" : "parallax-y-slow")}>
        <Reveal variant="mask" className="relative h-full min-h-[420px] overflow-hidden bg-rose-soft lg:min-h-[640px]">
          <Link href={href} data-cursor="Explore" className="group img-zoom absolute inset-0 block" aria-label={`Explore ${division.shortName}`}>
            <Image src={division.heroImage} alt="" fill sizes="(min-width:1024px) 40vw, 100vw" quality={65} className="object-cover" />
            <span className="absolute inset-0 bg-gradient-to-t from-obsidian/60 via-transparent to-transparent" aria-hidden />
            <span className="absolute inset-3 border border-porcelain/30" aria-hidden />
            <span className="absolute inset-x-7 bottom-7 flex items-end justify-between gap-4 text-porcelain">
              <span className="font-serif text-[clamp(1.5rem,2.4vw,2.1rem)] italic leading-tight">{caption}</span>
              <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full border border-porcelain/50 transition-[background-color,color,transform] duration-500 group-hover:-translate-y-0.5 group-hover:bg-white group-hover:text-midnight">
                →
              </span>
            </span>
          </Link>
        </Reveal>
        </div>
        <div className={cn("flex flex-col justify-between gap-12 lg:col-span-7", flip && "lg:order-1")}>
          <Reveal>
            <SectionHeading index={index} eyebrow={eyebrow} title={title} description={description} action={<ArrowLink href={href}>{cta}</ArrowLink>} />
          </Reveal>
          <div className="grid grid-cols-2 gap-x-3 gap-y-10 md:grid-cols-3 md:gap-x-6">
            {products.slice(0, 3).map((p, i) => (
              <Reveal key={p.id} delay={i * 90} className={cn(i === 2 && "max-md:hidden")}>
                <ProductCard product={p} sizes="(min-width:1024px) 18vw, (min-width:768px) 30vw, 48vw" />
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
