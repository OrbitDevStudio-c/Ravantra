import type { Metadata } from "next";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Clock } from "lucide-react";
import { getServiceBySlug, getServices, getStylists } from "@/features/salon/queries";
import { ArrowRight, Button } from "@/components/ui/button";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { formatINR } from "@/lib/utils";

export const revalidate = 300;

export async function generateStaticParams() {
  return (await getServices()).map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: PageProps<"/services/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const s = await getServiceBySlug(slug);
  if (!s) return {};
  return {
    title: `${s.name} — Salon & Spa`,
    description: s.description,
    alternates: { canonical: `/services/${s.slug}` },
    openGraph: { images: [{ url: s.image }] },
  };
}

export default async function ServicePage({ params }: PageProps<"/services/[slug]">) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) notFound();
  const [stylists, services] = await Promise.all([getStylists(), getServices()]);
  const experts = stylists.filter((s) => s.serviceIds.includes(service.id));
  const more = services.filter((s) => s.category === service.category && s.id !== service.id).slice(0, 3);

  return (
    <div className="container-lux pb-24 pt-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Salon & Spa", href: "/salon-spa" }, { label: service.category, href: `/salon-spa?category=${service.category}#services` }, { label: service.name }]} />
      <div className="mt-10 grid gap-12 lg:grid-cols-12">
        <div className="relative aspect-[4/5] overflow-hidden bg-champagne lg:col-span-6">
          <Image src={service.image} alt={service.name} fill priority sizes="(min-width:1024px) 48vw, 100vw" quality={70} className="mask-reveal object-cover" />
        </div>
        <div className="lg:col-span-5 lg:col-start-8 lg:pt-10">
          <p className="eyebrow text-sage">{service.category}</p>
          <h1 className="display mt-4 text-[clamp(2.6rem,5vw,4.4rem)]">{service.name}</h1>
          <p className="mt-6 leading-relaxed text-ink-soft">{service.description}</p>
          <div className="mt-8 flex items-center gap-8 border-y border-line py-6">
            <div><p className="eyebrow text-[0.6rem] text-ink-mute">Price</p><p className="mt-1 font-serif text-3xl">{formatINR(service.price)}</p></div>
            <div><p className="eyebrow text-[0.6rem] text-ink-mute">Duration</p><p className="mt-1 flex items-center gap-2 font-serif text-3xl"><Clock className="size-5 text-sage" strokeWidth={1.25} />{service.durationMin} min</p></div>
          </div>
          <Button size="lg" className="mt-8 w-full sm:w-auto" asChild><Link href={`/salon-spa/book?service=${service.slug}`}>Book this service <ArrowRight /></Link></Button>

          {experts.length > 0 && (
            <div className="mt-14">
              <p className="eyebrow text-mocha">Performed by</p>
              <ul className="mt-5 space-y-4">
                {experts.map((e) => (
                  <li key={e.id} className="flex items-center gap-4">
                    <span className="relative size-14 overflow-hidden rounded-full bg-champagne">
                      <Image src={e.image} alt={e.name} fill sizes="56px" quality={50} className="object-cover object-top" />
                    </span>
                    <div className="flex-1">
                      <p className="font-serif text-xl">{e.name}</p>
                      <p className="text-xs text-ink-soft">{e.title}</p>
                    </div>
                    <Link href={`/salon-spa/book?service=${service.slug}&stylist=${e.slug}`} className="text-[0.68rem] uppercase tracking-[0.16em] underline-offset-4 hover:underline">Book</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {more.length > 0 && (
        <section className="mt-24 border-t border-line pt-14">
          <h2 className="font-serif text-4xl">More {service.category.toLowerCase()} services</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            {more.map((s) => (
              <Link key={s.id} href={`/services/${s.slug}`} className="group">
                <div className="img-zoom relative aspect-[4/3] overflow-hidden bg-champagne">
                  <Image src={s.image} alt="" fill sizes="(min-width:768px) 30vw, 100vw" quality={55} className="object-cover" />
                </div>
                <p className="mt-4 font-serif text-2xl">{s.name}</p>
                <p className="text-sm text-ink-soft">{s.durationMin} min · {formatINR(s.price)}</p>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
