import Image from "@/components/ui/smart-image";
import Link from "next/link";
import type { Promotion, ProductWithRelations, Review } from "@/types";
import { ArrowRight, Button } from "@/components/ui/button";
import { ArrowLink, DemoTag, Eyebrow, SectionHeading, Stars } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { CountUp } from "@/components/ui/motion";
import { img } from "@/config/demo-data";
import { NewsletterForm } from "./newsletter-form";

export function BrandStory({ stats, index }: { stats: { value: string; label: string }[]; index?: string }) {
  return (
    <section className="section relative overflow-hidden bg-rose-soft">
      <div className="container-lux grid items-center gap-16 lg:grid-cols-12">
        <div className="relative order-2 lg:order-1 lg:col-span-5">
          <Reveal variant="mask" className="relative aspect-[4/5] w-[78%] overflow-hidden bg-rose-soft">
            <Image src={img("1483985988355-763728e1935b", 1200)} alt="A RAVANTRA client with shopping bags" fill sizes="(min-width:1024px) 30vw, 70vw" quality={60} className="object-cover" />
          </Reveal>
          {/* The inset rides a little faster than the page: two image layers, two depths */}
          <div className="parallax-y absolute -bottom-10 right-0 w-[46%]">
            <Reveal delay={350} className="relative aspect-square overflow-hidden border-[10px] border-rose-soft bg-rose-soft shadow-[var(--shadow-float)]">
              <Image src={img("1560066984-138dadb4c035", 800)} alt="Inside the RAVANTRA salon" fill sizes="20vw" quality={60} className="object-cover" />
            </Reveal>
          </div>
          <span className="absolute -left-2 top-8 hidden rotate-[-90deg] origin-left text-[0.6rem] uppercase tracking-[0.4em] text-gold md:block">Our story</span>
        </div>
        <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
          <Reveal>
            <Eyebrow className="flex items-center gap-3">{index && <><span className="font-serif text-[0.95rem] normal-case italic tracking-normal text-blush">{index}</span><span className="h-px w-8 bg-gold" aria-hidden /></>} The RAVANTRA vision</Eyebrow>
            <p className="display display-md mt-6 text-ink">
              We believe the way you dress, care for yourself and spend an hour of quiet are <em className="italic text-gradient">one story</em> — so we built one house for all of it.
            </p>
            <p className="mt-8 max-w-lg leading-relaxed text-ink-soft">
              RAVANTRA brings together considered fashion, clean beauty, a salon &amp; spa run by senior specialists and a lifestyle edit of things worth keeping.
              Every piece is chosen with makers across India — from Lucknow chikankari to Kannauj attar — and every visit is unhurried.
            </p>
          </Reveal>
          <dl className="mt-12 grid grid-cols-3 border-t border-line-strong">
            {stats.map((s, i) => (
              <Reveal key={s.label} delay={i * 100} className="border-r border-line-strong py-6 pr-4 last:border-r-0 [&:not(:first-child)]:pl-5">
                <dt className="sr-only">{s.label}</dt>
                <dd className="font-serif text-[clamp(2.2rem,4vw,3.4rem)] leading-none text-ink"><CountUp value={s.value} /></dd>
                <dd className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">{s.label}</dd>
              </Reveal>
            ))}
          </dl>
          <Reveal delay={200}>
            <ArrowLink href="/about" className="mt-10">Read our story</ArrowLink>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function PromoBanner({ promo }: { promo: Promotion }) {
  return (
    <section className="relative isolate overflow-hidden bg-obsidian">
      <div className="absolute inset-0 -z-10">
        <Image src={promo.image} alt="" fill sizes="100vw" quality={60} className="object-cover object-[50%_35%] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-obsidian/90 via-obsidian/50 to-transparent" />
      </div>
      <div className="container-lux grid min-h-[560px] items-center py-20 md:min-h-[640px]">
        <Reveal className="max-w-xl text-porcelain">
          <p className="eyebrow text-gold">{promo.eyebrow}</p>
          <h2 className="display display-lg mt-5">{promo.title}</h2>
          <p className="mt-6 max-w-md text-porcelain/80">{promo.subtitle}</p>
          <Button variant="light" size="lg" className="mt-10" asChild>
            <Link href={promo.ctaHref}>{promo.ctaLabel} <ArrowRight /></Link>
          </Button>
        </Reveal>
      </div>
      <p className="absolute bottom-6 right-6 hidden text-[0.6rem] uppercase tracking-[0.3em] text-porcelain/50 md:block">Limited season · While stocks last</p>
    </section>
  );
}

export function Testimonials({ items, index }: { items: (Review & { product: ProductWithRelations })[]; index?: string }) {
  if (!items.length) return null;
  return (
    <section className="section border-t border-line">
      <div className="container-lux">
        <Reveal>
          <SectionHeading
            index={index}
            eyebrow="In their words"
            title={<>Kind words from <em className="italic text-gradient">our clients</em></>}
            action={<DemoTag>Illustrative demo reviews</DemoTag>}
          />
        </Reveal>
        <div className="no-scrollbar -mx-[clamp(1rem,4vw,3.5rem)] mt-14 flex snap-x snap-mandatory scroll-px-[clamp(1rem,4vw,3.5rem)] gap-5 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] pb-2">
          {items.map((t, i) => (
            <Reveal
              as="figure"
              key={t.id}
              delay={i * 90}
              className="flex w-[86%] shrink-0 snap-start flex-col justify-between border border-line bg-plum p-8 transition-shadow duration-500 hover:shadow-[var(--shadow-card)] sm:w-[420px] md:p-10"
            >
              <div>
                <span aria-hidden className="block font-serif text-7xl leading-[0.5] text-gold">“</span>
                <Stars value={t.rating} className="mt-4" />
                <blockquote className="mt-5 font-serif text-[1.45rem] leading-snug text-ink">{t.body}</blockquote>
              </div>
              <figcaption className="mt-10 flex items-center gap-4 border-t border-line pt-6">
                <Link href={`/products/${t.product.slug}`} className="relative size-14 shrink-0 overflow-hidden bg-rose-soft">
                  {t.product.images[0] && <Image src={t.product.images[0].url} alt={t.product.name} fill sizes="56px" quality={50} className="object-cover" />}
                </Link>
                <div className="min-w-0">
                  <p className="text-sm font-medium">{t.authorName}</p>
                  <Link href={`/products/${t.product.slug}`} className="line-clamp-1 text-xs text-ink-mute hover:underline">on {t.product.name}</Link>
                </div>
              </figcaption>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NewsletterBand() {
  return (
    <section data-division="fashion" className="section-sm relative overflow-hidden bg-burgundy text-porcelain">
      <Reveal variant="fade" className="container-lux grid items-end gap-10 md:grid-cols-12">
        <span className="sweep-line" aria-hidden />
        <div className="md:col-span-6">
          <Eyebrow className="text-gold">The RAVANTRA letter</Eyebrow>
          <h2 className="display display-md mt-5 text-porcelain">
            First looks, salon openings &amp; <em className="italic text-gold">private offers.</em>
          </h2>
        </div>
        <div className="md:col-span-5 md:col-start-8">
          <p className="text-sm leading-relaxed text-porcelain/75">Once a fortnight. Thoughtful, never noisy — and new subscribers receive WELCOME10 for 10% off a first order.</p>
          <NewsletterForm source="home" tone="dark" />
        </div>
      </Reveal>
    </section>
  );
}
