import type { Metadata } from "next";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { getDivisions } from "@/features/catalog/queries";
import { getServices, getStylists } from "@/features/salon/queries";
import { ArrowRight, Button } from "@/components/ui/button";
import { Eyebrow, SectionHeading } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { cn, formatINR } from "@/lib/utils";

export const revalidate = 300;

export const metadata: Metadata = {
  title: "Salon & Spa",
  description: "Precision hair, results-driven facials, bridal artistry and restorative spa rituals at RAVANTRA Salon & Spa, Mumbai. Book online in under a minute.",
  alternates: { canonical: "/salon-spa" },
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function SalonPage({ searchParams }: PageProps<"/salon-spa">) {
  const sp = await searchParams;
  const [divisions, services, stylists] = await Promise.all([getDivisions(), getServices(), getStylists()]);
  const division = divisions.find((d) => d.kind === "services");
  const categories = [...new Set(services.map((s) => s.category))];
  const active = typeof sp.category === "string" && categories.includes(sp.category) ? sp.category : null;
  const shown = active ? categories.filter((c) => c === active) : categories;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BeautySalon",
    name: "RAVANTRA Salon & Spa",
    address: { "@type": "PostalAddress", streetAddress: "14 Linking Road, Bandra West", addressLocality: "Mumbai", postalCode: "400050", addressCountry: "IN" },
    priceRange: "₹₹₹",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Services",
      itemListElement: services.map((s) => ({ "@type": "Offer", price: s.price, priceCurrency: "INR", itemOffered: { "@type": "Service", name: s.name } })),
    },
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      {/* Hero */}
      <section data-division="salon-spa" className="relative overflow-hidden bg-sage-soft">
        <div className="container-lux grid gap-10 pb-16 pt-8 lg:grid-cols-12 lg:pb-24">
          <div className="lg:col-span-5 lg:pt-6">
            <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Salon & Spa" }]} />
            <p className="eyebrow mt-12 flex items-center gap-3 text-sage-light"><span className="h-px w-8 bg-current opacity-60" aria-hidden />RAVANTRA Salon &amp; Spa</p>
            <h1 className="display display-lg mt-4">
              An hour that <em className="italic text-sage-light">belongs</em> only to you.
            </h1>
            <p className="mt-6 max-w-md leading-relaxed text-ink-soft">{division?.description}</p>
            <div className="mt-10 flex flex-wrap gap-4">
              <Button size="lg" asChild><Link href="/salon-spa/book">Book an appointment <ArrowRight /></Link></Button>
              <Button size="lg" variant="outline" className="border-sage/60 text-sage-light hover:border-sage hover:bg-sage-deep" asChild><Link href="#services">View the menu</Link></Button>
            </div>
            <dl className="mt-14 grid grid-cols-3 gap-6 border-t border-sage/40 pt-6">
              {[
                [String(services.length), "Services"],
                [String(stylists.length), "Specialists"],
                ["7 days", "Open weekly"],
              ].map(([v, l]) => (
                <div key={l}>
                  <dd className="font-serif text-3xl text-ink">{v}</dd>
                  <dt className="mt-1 text-[0.65rem] uppercase tracking-[0.18em] text-ink-soft">{l}</dt>
                </div>
              ))}
            </dl>
          </div>
          <div className="relative grid grid-cols-5 gap-3 lg:col-span-7">
            <div className="relative col-span-3 aspect-[3/4] overflow-hidden bg-rose-soft">
              <Image src={division?.heroImage ?? services[0]?.image} alt="Stylist at work in the RAVANTRA salon" fill priority sizes="(min-width:1024px) 34vw, 60vw" quality={65} className="mask-reveal object-cover" />
            </div>
            <div className="col-span-2 flex flex-col gap-3 pt-16">
              <div className="relative aspect-[3/4] overflow-hidden bg-rose-soft">
                <Image src={division?.bannerImage ?? services[1]?.image} alt="Salon interior" fill sizes="22vw" quality={60} className="object-cover" />
              </div>
              <div className="bg-sage-deep p-5 text-porcelain">
                <p className="eyebrow text-porcelain/75">Hours</p>
                <p className="mt-2 font-serif text-xl leading-snug">Open daily<br />9 am – 8 pm IST</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Service menu */}
      <section id="services" data-division="salon-spa" className="section scroll-mt-20">
        <div className="container-lux">
          <SectionHeading eyebrow="The menu" title={<>Services &amp; <em className="italic text-sage-light">rituals</em></>} description="Transparent pricing. Every service begins with a consultation." />
          <div className="no-scrollbar mt-10 flex gap-2 overflow-x-auto">
            <Link href="/salon-spa#services" scroll={false} aria-current={!active ? "page" : undefined} className={cn("shrink-0 rounded-full border px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] transition-colors duration-300", !active ? "border-sage bg-sage-deep text-porcelain" : "border-line-strong hover:border-sage hover:text-sage-light")}>All</Link>
            {categories.map((c) => (
              <Link key={c} href={`/salon-spa?category=${encodeURIComponent(c)}#services`} scroll={false} aria-current={active === c ? "page" : undefined} className={cn("shrink-0 rounded-full border px-4 py-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] transition-colors duration-300", active === c ? "border-sage bg-sage-deep text-porcelain" : "border-line-strong hover:border-sage hover:text-sage-light")}>
                {c}
              </Link>
            ))}
          </div>
          <div className="mt-14 space-y-20">
            {shown.map((cat) => (
              <div key={cat} className="grid gap-8 lg:grid-cols-12">
                <div className="lg:col-span-3">
                  <h3 className="font-serif text-[2.25rem] leading-none text-sage-light lg:sticky lg:top-28">{cat}</h3>
                </div>
                <ul className="divide-y divide-line border-y border-line lg:col-span-9">
                  {services.filter((s) => s.category === cat).map((s) => (
                    <li key={s.id} className="group grid gap-5 py-6 sm:grid-cols-[110px_1fr_auto] sm:items-center">
                      <Link href={`/services/${s.slug}`} className="img-zoom relative hidden aspect-square overflow-hidden bg-rose-soft sm:block">
                        <Image src={s.image} alt="" fill sizes="110px" quality={50} className="object-cover" />
                      </Link>
                      <div>
                        <Link href={`/services/${s.slug}`} className="font-serif text-2xl text-ink transition-colors hover:text-sage-light">{s.name}</Link>
                        <p className="mt-1 max-w-xl text-sm leading-relaxed text-ink-soft">{s.description}</p>
                        <p className="mt-2 text-[0.68rem] uppercase tracking-[0.18em] text-ink-mute">{s.durationMin} min · {formatINR(s.price)}</p>
                      </div>
                      <Button variant="outline" size="sm" className="border-sage/60 text-sage-light hover:border-sage hover:bg-sage-deep" asChild><Link href={`/salon-spa/book?service=${s.slug}`} aria-label={`Book ${s.name}`}>Book</Link></Button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Experts */}
      <section id="experts" className="section scroll-mt-20 border-t border-line bg-plum/50">
        <div className="container-lux">
          <SectionHeading eyebrow="Our specialists" title={<>Meet the <em className="italic text-sage-light">experts</em></>} description="Senior specialists with a combined experience of over three decades." />
          <div className="mt-14 grid gap-x-6 gap-y-14 sm:grid-cols-2 lg:grid-cols-4">
            {stylists.map((s, i) => (
              <Reveal key={s.id} delay={i * 90} className="group">
                <div className="img-zoom relative aspect-[3/4] overflow-hidden bg-rose-soft">
                  <Image src={s.image} alt={s.name} fill sizes="(min-width:1024px) 22vw, 45vw" quality={60} className="object-cover object-top grayscale-[25%] transition duration-700 group-hover:grayscale-0" />
                  <span className="absolute left-4 top-4 bg-midnight/95 px-2 py-1 text-[0.6rem] font-semibold uppercase tracking-[0.18em] text-sage-light">{s.experienceYears} yrs</span>
                </div>
                <h3 className="mt-5 font-serif text-2xl">{s.name}</h3>
                <p className="text-xs uppercase tracking-[0.16em] text-sage-light">{s.title}</p>
                <p className="mt-3 text-sm leading-relaxed text-ink-soft">{s.bio}</p>
                <p className="mt-3 text-[0.68rem] text-ink-mute">
                  Works {s.workingHours.map((w) => DAYS[w.weekday]).join(" · ")}
                </p>
                <Link href={`/salon-spa/book?stylist=${s.slug}`} className="group/l mt-4 inline-flex items-center gap-2 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:text-sage-light">
                  <span className="link-u">Book with {s.name.split(" ")[0]}</span> <span aria-hidden className="transition-transform group-hover/l:translate-x-1">→</span>
                </Link>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="section bg-sage-soft">
        <div className="container-lux grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <Eyebrow>How booking works</Eyebrow>
            <h2 className="display display-md mt-4">Six calm <em className="italic text-sage-light">steps.</em></h2>
            <Button size="lg" className="mt-8" asChild><Link href="/salon-spa/book">Start booking <ArrowRight /></Link></Button>
          </div>
          <ol className="grid gap-px bg-sage/30 sm:grid-cols-3 lg:col-span-8">
            {["Choose a service", "Pick your specialist", "Select a date", "Choose a time", "Add your details", "Confirm — that's it"].map((t, i) => (
              <li key={t} className="bg-midnight p-6 transition-colors duration-500 hover:bg-plum">
                <span className="font-serif text-4xl italic text-sage-light">0{i + 1}</span>
                <p className="mt-6 text-sm">{t}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>
    </>
  );
}
