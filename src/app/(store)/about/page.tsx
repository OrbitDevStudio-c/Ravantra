import type { Metadata } from "next";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { getDivisions } from "@/features/catalog/queries";
import { ArrowRight, Button } from "@/components/ui/button";
import { Eyebrow } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { NewsletterBand } from "@/components/home/sections";
import { img } from "@/config/demo-data";

export const revalidate = 3600;
export const metadata: Metadata = {
  title: "Our story",
  description: "RAVANTRA is a modern women's lifestyle house bringing fashion, beauty, salon & spa and lifestyle together under one roof.",
  alternates: { canonical: "/about" },
};

const VALUES = [
  ["Made with makers", "We work directly with artisans and small studios across India — Lucknow, Varanasi, Kanchipuram, Kannauj — and credit them by name."],
  ["Fewer, better", "We edit hard. Every piece and every service has to earn its place, and has to last."],
  ["Unhurried care", "Our salon never double-books. Our stylists get the time they need, and so do you."],
  ["One house", "One account, one bag, one standard — whether you're buying a saree or booking a facial."],
];

export default async function AboutPage() {
  const divisions = await getDivisions();
  return (
    <>
      <section className="container-lux grid gap-12 pb-20 pt-14 lg:grid-cols-12">
        <div className="lg:col-span-7">
          <Eyebrow>Our story</Eyebrow>
          <h1 className="display mt-6 text-[clamp(3rem,7vw,7rem)]">
            A house for <em className="italic text-mocha">every part</em> of you.
          </h1>
        </div>
        <p className="self-end text-[1.02rem] leading-relaxed text-ink-soft lg:col-span-4 lg:col-start-9">
          RAVANTRA began with a simple frustration: the things that make a woman feel like herself — what she wears, how she cares for her skin and hair,
          the hour she takes for herself — lived in a dozen disconnected places. So we built one considered house for all of it.
        </p>
      </section>

      <section className="relative h-[60vh] min-h-[420px] overflow-hidden bg-champagne">
        <Image src={img("1445205170230-053b83016050", 2000)} alt="Inside a RAVANTRA atelier" fill sizes="100vw" quality={65} className="object-cover" />
      </section>

      <section className="container-lux py-24">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>What we believe</Eyebrow>
            <h2 className="display mt-4 text-5xl">Four principles</h2>
          </div>
          <dl className="grid gap-px bg-line sm:grid-cols-2 lg:col-span-8">
            {VALUES.map(([t, d], i) => (
              <Reveal key={t} delay={i * 80} className="bg-ivory p-8">
                <span className="font-serif text-sm italic text-gold-deep">0{i + 1}</span>
                <dt className="mt-4 font-serif text-3xl">{t}</dt>
                <dd className="mt-3 text-sm leading-relaxed text-ink-soft">{d}</dd>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      <section className="border-t border-line bg-white/40 py-24">
        <div className="container-lux">
          <Eyebrow>The divisions</Eyebrow>
          <ul className="mt-10 divide-y divide-line border-y border-line">
            {divisions.map((d, i) => (
              <li key={d.id}>
                <Link href={d.kind === "services" ? "/salon-spa" : `/${d.slug}`} className="group grid items-center gap-6 py-8 md:grid-cols-[80px_1fr_1.4fr_120px]">
                  <span className="font-serif text-lg italic text-gold-deep">0{i + 1}</span>
                  <span className="font-serif text-4xl transition-transform duration-500 group-hover:translate-x-2">{d.name}</span>
                  <span className="text-sm leading-relaxed text-ink-soft">{d.description}</span>
                  <span className="relative hidden aspect-square overflow-hidden bg-champagne md:block">
                    <Image src={d.heroImage} alt="" fill sizes="120px" quality={50} className="object-cover transition duration-700 group-hover:scale-105" />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
          <div className="mt-14 flex flex-wrap gap-4">
            <Button size="lg" asChild><Link href="/products">Shop the house <ArrowRight /></Link></Button>
            <Button size="lg" variant="outline" asChild><Link href="/salon-spa/book">Book a visit</Link></Button>
          </div>
          <p className="mt-16 max-w-2xl text-xs leading-relaxed text-ink-mute">
            RAVANTRA is a fictional brand created as a demonstration platform by OrbitDevStudio. Names, people, products, reviews and transactions shown are illustrative.
          </p>
        </div>
      </section>
      <NewsletterBand />
    </>
  );
}
