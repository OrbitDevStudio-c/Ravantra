import Image from "@/components/ui/smart-image";
import Link from "next/link";
import type { Promotion, ProductWithRelations, Review } from "@/types";
import { ArrowRight, Button } from "@/components/ui/button";
import { DemoTag, Eyebrow, SectionHeading, Stars } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { img } from "@/config/demo-data";
import { NewsletterForm } from "./newsletter-form";

export function BrandStory({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <section className="relative overflow-hidden bg-champagne/45 py-24 md:py-36">
      <div className="container-lux grid items-center gap-16 lg:grid-cols-12">
        <div className="relative order-2 lg:order-1 lg:col-span-5">
          <Reveal className="relative aspect-[4/5] w-[78%] overflow-hidden bg-champagne">
            <Image src={img("1483985988355-763728e1935b", 1200)} alt="A RAVANTRA client with shopping bags" fill sizes="(min-width:1024px) 30vw, 70vw" quality={60} className="object-cover" />
          </Reveal>
          <Reveal delay={150} className="absolute -bottom-10 right-0 aspect-square w-[46%] overflow-hidden border-[10px] border-ivory bg-champagne">
            <Image src={img("1560066984-138dadb4c035", 800)} alt="Inside the RAVANTRA salon" fill sizes="20vw" quality={60} className="object-cover" />
          </Reveal>
          <span className="absolute -left-2 top-8 hidden rotate-[-90deg] origin-left text-[0.6rem] uppercase tracking-[0.4em] text-mocha md:block">Our story</span>
        </div>
        <div className="order-1 lg:order-2 lg:col-span-6 lg:col-start-7">
          <Reveal>
            <Eyebrow className="flex items-center gap-3"><span className="font-serif text-sm normal-case italic tracking-normal text-gold-deep">IV.</span><span className="h-px w-8 bg-line-strong" /> The RAVANTRA vision</Eyebrow>
            <p className="display mt-6 text-[clamp(2rem,3.8vw,3.4rem)] text-espresso">
              We believe the way you dress, care for yourself and spend an hour of quiet are <em className="italic text-mocha">one story</em> — so we built one house for all of it.
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
                <dd className="font-serif text-[clamp(2.2rem,4vw,3.4rem)] leading-none text-espresso">{s.value}</dd>
                <dd className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-ink-soft">{s.label}</dd>
              </Reveal>
            ))}
          </dl>
          <Reveal delay={200}>
            <Link href="/about" className="group mt-10 inline-flex items-center gap-3 text-[0.78rem] font-medium uppercase tracking-[0.16em]">
              <span className="link-u">Read our story</span> <ArrowRight />
            </Link>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

export function PromoBanner({ promo }: { promo: Promotion }) {
  return (
    <section className="relative isolate overflow-hidden bg-espresso">
      <div className="absolute inset-0 -z-10">
        <Image src={promo.image} alt="" fill sizes="100vw" quality={60} className="object-cover object-[50%_35%] opacity-70" />
        <div className="absolute inset-0 bg-gradient-to-r from-espresso/90 via-espresso/50 to-transparent" />
      </div>
      <div className="container-lux grid min-h-[560px] items-center py-20 md:min-h-[640px]">
        <Reveal className="max-w-xl text-ivory">
          <p className="eyebrow text-gold">{promo.eyebrow}</p>
          <h2 className="display mt-5 text-[clamp(2.6rem,5.5vw,5rem)]">{promo.title}</h2>
          <p className="mt-6 max-w-md text-ivory/80">{promo.subtitle}</p>
          <Button variant="light" size="lg" className="mt-10" asChild>
            <Link href={promo.ctaHref}>{promo.ctaLabel} <ArrowRight /></Link>
          </Button>
        </Reveal>
      </div>
      <p className="absolute bottom-6 right-6 hidden text-[0.6rem] uppercase tracking-[0.3em] text-ivory/50 md:block">Limited season · While stocks last</p>
    </section>
  );
}

export function Testimonials({ items }: { items: (Review & { product: ProductWithRelations })[] }) {
  if (!items.length) return null;
  return (
    <section className="py-24 md:py-32">
      <div className="container-lux">
        <Reveal>
          <SectionHeading
            index="VI."
            eyebrow="In their words"
            title={<>Kind words from <em className="italic text-mocha">our clients</em></>}
            action={<DemoTag>Illustrative demo reviews</DemoTag>}
          />
        </Reveal>
        <div className="no-scrollbar -mx-[clamp(1rem,4vw,3.5rem)] mt-14 flex snap-x snap-mandatory scroll-px-[clamp(1rem,4vw,3.5rem)] gap-5 overflow-x-auto px-[clamp(1rem,4vw,3.5rem)] pb-2">
          {items.map((t, i) => (
            <Reveal
              as="figure"
              key={t.id}
              delay={i * 90}
              className="flex w-[86%] shrink-0 snap-start flex-col justify-between border border-line bg-white/50 p-8 sm:w-[420px] md:p-10"
            >
              <div>
                <span aria-hidden className="block font-serif text-7xl leading-[0.5] text-gold/70">“</span>
                <Stars value={t.rating} className="mt-4" />
                <blockquote className="mt-5 font-serif text-[1.45rem] leading-snug text-espresso">{t.body}</blockquote>
              </div>
              <figcaption className="mt-10 flex items-center gap-4 border-t border-line pt-6">
                <Link href={`/products/${t.product.slug}`} className="relative size-14 shrink-0 overflow-hidden bg-champagne">
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
    <section className="border-t border-line bg-ivory-2 py-20 md:py-28">
      <div className="container-lux grid items-end gap-10 md:grid-cols-12">
        <div className="md:col-span-6">
          <Eyebrow>The RAVANTRA letter</Eyebrow>
          <h2 className="display mt-5 text-[clamp(2.2rem,4.4vw,3.8rem)]">
            First looks, salon openings &amp; <em className="italic text-mocha">private offers.</em>
          </h2>
        </div>
        <div className="md:col-span-5 md:col-start-8">
          <p className="text-sm leading-relaxed text-ink-soft">Once a fortnight. Thoughtful, never noisy — and new subscribers receive WELCOME10 for 10% off a first order.</p>
          <NewsletterForm source="home" />
        </div>
      </div>
    </section>
  );
}
