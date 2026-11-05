import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllProductSlugs, getProductBySlug, getProductReviews, getRelatedProducts } from "@/features/catalog/queries";
import { productFromPrice, productStock } from "@/features/catalog/pricing";
import { ProductGallery } from "@/components/products/product-gallery";
import { ProductPurchase } from "@/components/products/product-purchase";
import { ProductCard } from "@/components/products/product-card";
import { ReviewForm } from "@/components/products/review-form";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge, DemoTag, SectionHeading, Stars } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";
import { absoluteUrl, formatDate } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  const slugs = await getAllProductSlugs();
  return slugs.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/products/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProductBySlug(slug);
  if (!p) return { title: "Product not found" };
  const { price } = productFromPrice(p);
  return {
    title: `${p.name} — ${p.division.shortName}`,
    description: p.shortDescription,
    alternates: { canonical: `/products/${p.slug}` },
    openGraph: {
      title: p.name,
      description: p.shortDescription,
      images: p.images.slice(0, 2).map((i) => ({ url: i.url, alt: i.alt })),
    },
    other: { "product:price:amount": String(price), "product:price:currency": "INR" },
  };
}

export default async function ProductPage({ params }: PageProps<"/products/[slug]">) {
  const { slug } = await params;
  const product = await getProductBySlug(slug);
  if (!product) notFound();

  const [reviews, related] = await Promise.all([getProductReviews(product.id), getRelatedProducts(product, 4)]);
  const divisionHref = `/${product.division.slug}`;
  const { price } = productFromPrice(product);
  const inStock = productStock(product) > 0;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    sku: product.sku,
    image: product.images.map((i) => i.url),
    brand: { "@type": "Brand", name: "RAVANTRA" },
    category: `${product.division.shortName} > ${product.category.name}`,
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "INR",
      lowPrice: price,
      highPrice: Math.max(...product.variants.map((v) => v.price ?? product.price)),
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      url: absoluteUrl(`/products/${product.slug}`),
    },
    ...(product.ratingCount > 0 && {
      aggregateRating: { "@type": "AggregateRating", ratingValue: product.ratingAvg, reviewCount: product.ratingCount },
    }),
  };

  const sections = [
    { title: "Description", body: <p className="leading-relaxed">{product.description}</p>, open: true },
    {
      title: "Details",
      body: (
        <ul className="grid gap-2">
          {product.highlights.map((h) => (
            <li key={h} className="flex gap-3"><span className="mt-2 size-1 shrink-0 rounded-full bg-gold" />{h}</li>
          ))}
        </ul>
      ),
    },
    ...(product.ingredients ? [{ title: "Ingredients", body: <p className="leading-relaxed">{product.ingredients}</p> }] : []),
    {
      title: "Delivery & returns",
      body: (
        <p className="leading-relaxed">
          Complimentary shipping on orders above ₹2,999 (₹149 otherwise). Orders dispatch within 24–48 hours from Mumbai.
          Unworn, unopened items can be returned within 7 days — beauty products must be sealed.
        </p>
      ),
    },
  ];

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <div className="container-lux pt-6 md:pt-8">
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: product.division.shortName, href: divisionHref },
            { label: product.category.name, href: `${divisionHref}?category=${product.category.slug}` },
            { label: product.name },
          ]}
        />
      </div>

      <section className="container-lux grid gap-10 pb-20 pt-6 md:grid-cols-12 md:gap-10 lg:gap-16">
        <div className="md:col-span-7">
          <ProductGallery images={product.images} name={product.name} />
        </div>
        <div className="md:col-span-5">
          <div className="md:sticky md:top-24">
            <div className="flex items-center gap-3">
              <Link href={divisionHref} className="eyebrow text-mocha hover:text-espresso">{product.division.shortName}</Link>
              <span className="h-px w-6 bg-line-strong" />
              <span className="eyebrow text-ink-mute">{product.category.name}</span>
              {product.isNew && <Badge tone="gold">New</Badge>}
            </div>
            <h1 className="display mt-4 text-[clamp(2.3rem,3.6vw,3.4rem)] text-espresso">{product.name}</h1>
            {product.ratingCount > 0 && (
              <a href="#reviews" className="mt-3 inline-flex items-center gap-2 text-xs text-ink-soft hover:text-espresso">
                <Stars value={product.ratingAvg} /> {product.ratingAvg.toFixed(1)} · {product.ratingCount} review{product.ratingCount > 1 ? "s" : ""}
              </a>
            )}
            <p className="mt-5 text-[0.98rem] leading-relaxed text-ink-soft">{product.shortDescription}</p>

            <div className="mt-8">
              <ProductPurchase
                productId={product.id}
                slug={product.slug}
                name={product.name}
                image={product.images[0]?.url ?? ""}
                division={product.division.shortName}
                basePrice={product.price}
                baseSale={product.salePrice}
                variants={product.variants}
              />
            </div>

            <div className="mt-2 divide-y divide-line">
              {sections.map((s) => (
                <details key={s.title} open={s.open} className="group py-5">
                  <summary className="flex cursor-pointer list-none items-center justify-between">
                    <span className="eyebrow text-espresso">{s.title}</span>
                    <span className="text-lg leading-none text-ink-mute transition-transform duration-300 group-open:rotate-45">+</span>
                  </summary>
                  <div className="pt-4 text-sm text-ink-soft">{s.body}</div>
                </details>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Reviews */}
      <section id="reviews" className="border-t border-line bg-white/40 py-20">
        <div className="container-lux grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <p className="eyebrow text-mocha">Reviews</p>
            <p className="mt-4 font-serif text-7xl leading-none">{product.ratingCount ? product.ratingAvg.toFixed(1) : "—"}</p>
            {product.ratingCount > 0 && <Stars value={product.ratingAvg} size={16} className="mt-3" />}
            <p className="mt-2 text-sm text-ink-soft">{product.ratingCount ? `Based on ${product.ratingCount} review${product.ratingCount > 1 ? "s" : ""}` : "No reviews yet"}</p>
            <div className="mt-8">
              <ReviewForm productId={product.id} slug={product.slug} />
            </div>
          </div>
          <div className="lg:col-span-8">
            {reviews.length === 0 ? (
              <p className="font-serif text-2xl text-ink-soft">Be the first to share your thoughts.</p>
            ) : (
              <ul className="divide-y divide-line border-y border-line">
                {reviews.map((r) => (
                  <li key={r.id} className="grid gap-3 py-7 md:grid-cols-[180px_1fr]">
                    <div>
                      <p className="text-sm font-medium">{r.authorName}</p>
                      <p className="mt-1 text-xs text-ink-mute">{formatDate(r.createdAt)}</p>
                      {r.isDemo && <DemoTag className="mt-2">Demo review</DemoTag>}
                    </div>
                    <div>
                      <Stars value={r.rating} />
                      <p className="mt-2 font-serif text-xl">{r.title}</p>
                      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{r.body}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className="py-20 md:py-28">
          <div className="container-lux">
            <SectionHeading eyebrow="You may also love" title={<>Complete <em className="italic text-mocha">the look</em></>} />
            <div className="mt-12 grid grid-cols-2 gap-x-4 gap-y-12 md:grid-cols-4 md:gap-x-6">
              {related.map((p, i) => (
                <Reveal key={p.id} delay={i * 80}>
                  <ProductCard product={p} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
