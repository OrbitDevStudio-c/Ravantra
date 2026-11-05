import Link from "next/link";
import { Hero } from "@/components/home/hero";
import { DivisionsShowcase } from "@/components/home/divisions-showcase";
import { ServicesMenu } from "@/components/home/services-menu";
import { ProductRail } from "@/components/home/product-rail";
import { BrandStory, NewsletterBand, PromoBanner, Testimonials } from "@/components/home/sections";
import { ProductCard } from "@/components/products/product-card";
import { ArrowRight } from "@/components/ui/button";
import { SectionHeading } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { getDivisions, getFeaturedProducts, getNewArrivals, getPromotions, getTestimonials, listProducts } from "@/features/catalog/queries";
import { getServices, getStylists } from "@/features/salon/queries";
import { BRAND } from "@/config/site";
import { SITE_URL } from "@/lib/env";

export const revalidate = 300;

export default async function HomePage() {
  const [divisions, featured, arrivals, services, stylists, promos, testimonials, all] = await Promise.all([
    getDivisions(),
    getFeaturedProducts(8),
    getNewArrivals(10),
    getServices(),
    getStylists(),
    getPromotions(),
    getTestimonials(6),
    listProducts(),
  ]);

  const counts: Record<string, string> = {};
  for (const d of divisions) {
    if (d.kind === "services") counts[d.id] = `${services.length} services`;
    else counts[d.id] = `${all.products.filter((p) => p.divisionId === d.id).length} pieces`;
  }
  const popular = services.filter((s) => s.isPopular).slice(0, 6);
  const banner = promos.find((p) => p.placement === "home_banner");

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: BRAND.name,
    url: SITE_URL,
    slogan: BRAND.tagline,
    description: BRAND.description,
    address: { "@type": "PostalAddress", streetAddress: BRAND.contact.address, addressCountry: "IN" },
    sameAs: BRAND.social.map((s) => s.href),
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Hero divisions={divisions} />
      <DivisionsShowcase divisions={divisions} counts={counts} />

      {/* Featured products */}
      <section className="pb-24 md:pb-32">
        <div className="container-lux">
          <Reveal>
            <SectionHeading
              index="II."
              eyebrow="Curated across the house"
              title={<>The <em className="italic text-mocha">considered</em> edit</>}
              action={
                <Link href="/products" className="group inline-flex items-center gap-3 text-[0.78rem] font-medium uppercase tracking-[0.16em]">
                  <span className="link-u">Shop all</span> <ArrowRight />
                </Link>
              }
            />
          </Reveal>
          <div className="mt-14 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 80}>
                <ProductCard product={p} index={i} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* Popular services */}
      <section id="services" className="border-t border-line bg-white/40 py-24 md:py-32">
        <div className="container-lux">
          <Reveal>
            <SectionHeading
              index="III."
              eyebrow="Salon & Spa"
              title={<>An hour that <em className="italic text-mocha">belongs to you</em></>}
              description={`${stylists.length} senior specialists. Real-time availability. Book in under a minute.`}
              action={
                <Link href="/salon-spa/book" className="group inline-flex items-center gap-3 text-[0.78rem] font-medium uppercase tracking-[0.16em]">
                  <span className="link-u">Book an appointment</span> <ArrowRight />
                </Link>
              }
            />
          </Reveal>
          <div className="mt-14">
            <ServicesMenu services={popular} />
          </div>
        </div>
      </section>

      <BrandStory
        stats={[
          { value: String(divisions.length).padStart(2, "0"), label: "Divisions" },
          { value: `${all.total}+`, label: "Curated pieces" },
          { value: String(stylists.length).padStart(2, "0"), label: "Specialists" },
        ]}
      />

      {/* New arrivals */}
      <section className="py-24 md:py-32">
        <div className="container-lux">
          <Reveal>
            <SectionHeading
              index="V."
              eyebrow="Just landed"
              title={<>New <em className="italic text-mocha">arrivals</em></>}
              action={
                <Link href="/products?sort=newest" className="group inline-flex items-center gap-3 text-[0.78rem] font-medium uppercase tracking-[0.16em]">
                  <span className="link-u">View all new</span> <ArrowRight />
                </Link>
              }
            />
          </Reveal>
          <div className="mt-14">
            <ProductRail label="New arrivals">
              {arrivals.map((p) => (
                <div key={p.id} className="w-[62%] shrink-0 snap-start sm:w-[38%] lg:w-[23%]">
                  <ProductCard product={p} sizes="(min-width:1024px) 23vw, (min-width:640px) 38vw, 62vw" />
                </div>
              ))}
            </ProductRail>
          </div>
        </div>
      </section>

      {banner && <PromoBanner promo={banner} />}
      <Testimonials items={testimonials} />
      <NewsletterBand />
    </>
  );
}
