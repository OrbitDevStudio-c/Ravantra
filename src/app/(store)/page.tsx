import { Hero } from "@/components/home/hero";
import { DivisionsShowcase } from "@/components/home/divisions-showcase";
import { ServicesMenu } from "@/components/home/services-menu";
import { ProductRail } from "@/components/home/product-rail";
import { BrandStory, NewsletterBand, PromoBanner, Testimonials } from "@/components/home/sections";
import { ProductCard } from "@/components/products/product-card";
import { ArrowLink, SectionHeading } from "@/components/ui/primitives";
import { BrandIntro, DivisionEdit, FeaturedCollections } from "@/components/home/editorial";
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
  // Division edits: prefer featured pieces, then newest, so each edit leads with its best
  const editFor = (slug: string) => {
    const division = divisions.find((d) => d.slug === slug);
    if (!division) return null;
    const items = all.products.filter((p) => p.divisionId === division.id);
    const ranked = [...items.filter((p) => p.isFeatured), ...items.filter((p) => !p.isFeatured)];
    return { division, products: ranked.slice(0, 3) };
  };
  const beauty = editFor("beauty");
  const lifestyle = editFor("lifestyle");

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
      <BrandIntro />
      <DivisionsShowcase divisions={divisions} counts={counts} />
      <FeaturedCollections index="II." />

      {/* Featured products */}
      <section className="section border-t border-line">
        <div className="container-lux">
          <Reveal>
            <SectionHeading
              index="III."
              eyebrow="Curated across the house"
              title={<>The <em className="italic text-gradient">considered</em> edit</>}
              action={<ArrowLink href="/products">Shop all</ArrowLink>}
            />
          </Reveal>
          <div className="mt-12 grid grid-cols-2 gap-x-3 gap-y-12 md:mt-14 md:grid-cols-3 md:gap-x-6 xl:grid-cols-4">
            {featured.map((p, i) => (
              <Reveal key={p.id} delay={(i % 4) * 80}>
                <ProductCard product={p} index={i} />
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {beauty && (
        <DivisionEdit
          {...beauty}
          index="IV."
          eyebrow="Beauty & Care"
          title={<>Beauty <em className="italic text-gradient">essentials</em></>}
          description="Clean formulations for skin, hair and colour — the few things worth reaching for every day."
          cta="Shop beauty"
          caption="The daily ritual"
        />
      )}

      {/* Popular services */}
      <section id="services" data-division="salon-spa" className="section relative overflow-hidden bg-sage-soft">
        <div className="container-lux">
          <Reveal>
            <SectionHeading
              index="V."
              eyebrow="Salon & Spa"
              title={<>An hour that <em className="italic text-sage-light">belongs to you</em></>}
              description={`${stylists.length} senior specialists. Real-time availability. Book in under a minute.`}
              action={<ArrowLink href="/salon-spa/book">Book an appointment</ArrowLink>}
            />
          </Reveal>
          <div className="mt-14">
            <ServicesMenu services={popular} />
          </div>
        </div>
      </section>

      <BrandStory
        index="VI."
        stats={[
          { value: String(divisions.length).padStart(2, "0"), label: "Divisions" },
          { value: `${all.total}+`, label: "Curated pieces" },
          { value: String(stylists.length).padStart(2, "0"), label: "Specialists" },
        ]}
      />

      {lifestyle && (
        <DivisionEdit
          {...lifestyle}
          flip
          index="VII."
          eyebrow="Lifestyle"
          title={<>Objects worth <em className="italic text-gold">keeping</em></>}
          description="Handbags, jewellery, fragrance and accessories chosen to be worn, gifted and passed on."
          cta="Shop lifestyle"
          caption="The keepsake edit"
        />
      )}

      {/* New arrivals */}
      <section className="section">
        <div className="container-lux">
          <Reveal>
            <SectionHeading
              index="VIII."
              eyebrow="Just landed"
              title={<>New <em className="italic text-gradient">arrivals</em></>}
              action={<ArrowLink href="/products?sort=newest">View all new</ArrowLink>}
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
      <Testimonials index="IX." items={testimonials} />
      <NewsletterBand />
    </>
  );
}
