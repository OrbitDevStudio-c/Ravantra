import Link from "next/link";
import { BRAND, SHIPPING_RULES } from "@/config/site";
import { formatINR } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import type { Division } from "@/types";
import { Gift, RotateCcw, ShieldCheck, Truck } from "lucide-react";

const PROMISES = [
  { icon: Truck, title: "Complimentary shipping", body: `On orders above ${formatINR(SHIPPING_RULES.freeAbove)}` },
  { icon: RotateCcw, title: "7-day returns", body: "On unworn pieces with tags" },
  { icon: Gift, title: "Gift-wrapped", body: "Every order, ready to give" },
  { icon: ShieldCheck, title: "Secure checkout", body: "UPI, cards & net banking" },
];

export function SiteFooter({ divisions }: { divisions: Division[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden bg-obsidian text-porcelain">
      {/* Service promises */}
      <div className="border-b border-porcelain/10">
        <ul className="container-lux grid grid-cols-2 gap-x-6 gap-y-8 py-10 lg:grid-cols-4">
          {PROMISES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex items-start gap-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-full border border-gold/40 text-gold">
                <Icon className="size-[18px]" strokeWidth={1.25} />
              </span>
              <span>
                <span className="block font-serif text-[1.15rem] leading-tight text-porcelain">{title}</span>
                <span className="mt-1 block text-[0.78rem] text-porcelain/60">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="container-lux grid grid-cols-2 gap-x-6 gap-y-12 pb-10 pt-16 md:grid-cols-12 md:gap-14 md:pt-20">
        <div className="col-span-2 md:col-span-4">
          <Logo variant="full" tone="light" height={150} />
          <p className="mt-6 max-w-sm font-serif text-2xl italic leading-snug text-porcelain/80">{BRAND.tagline}</p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-porcelain/65">
            Fashion, beauty, salon &amp; spa and lifestyle — four divisions, one account, one standard of care.
          </p>
          <Link href="/salon-spa/book" className="group mt-8 inline-flex items-center gap-3 border border-porcelain/30 px-5 py-3 text-[0.7rem] font-semibold uppercase tracking-[0.2em] transition hover:border-gold hover:text-gold">
            Book an appointment <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
          </Link>
        </div>
        <FooterCol title="Shop" className="md:col-span-2 md:col-start-6">
          {divisions.map((d) => (
            <FooterLink key={d.id} href={d.kind === "services" ? "/salon-spa" : `/${d.slug}`}>{d.shortName}</FooterLink>
          ))}
          <FooterLink href="/products?sort=newest">New arrivals</FooterLink>
          <FooterLink href="/divisions">Our houses</FooterLink>
          <FooterLink href="/products">All products</FooterLink>
        </FooterCol>
        <FooterCol title="Experiences" className="md:col-span-2">
          <FooterLink href="/salon-spa/book">Book an appointment</FooterLink>
          <FooterLink href="/salon-spa#experts">Our experts</FooterLink>
          <FooterLink href="/salon-spa#services">Service menu</FooterLink>
          <FooterLink href="/about">Our story</FooterLink>
        </FooterCol>
        <FooterCol title="Customer care" className="col-span-2 sm:col-span-1 md:col-span-2">
          <FooterLink href="/account">My account</FooterLink>
          <FooterLink href="/account/orders">Track an order</FooterLink>
          <FooterLink href="/contact">Contact us</FooterLink>
          <FooterLink href="/contact#faq">Shipping & returns</FooterLink>
        </FooterCol>
        <div className="col-span-2 md:col-span-12">
          <div className="grid gap-8 border-t border-porcelain/15 pt-10 text-sm text-porcelain/75 md:grid-cols-3">
            <div>
              <p className="eyebrow mb-3 text-gold">Visit</p>
              <p>{BRAND.contact.address}</p>
              <p className="mt-1">{BRAND.contact.hours}</p>
            </div>
            <div>
              <p className="eyebrow mb-3 text-gold">Write · Call</p>
              <p>{BRAND.contact.email}</p>
              <p className="mt-1">{BRAND.contact.phone}</p>
            </div>
            <div>
              <p className="eyebrow mb-3 text-gold">Follow</p>
              <div className="flex gap-5">
                {BRAND.social.map((s) => (
                  <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" className="link-u">{s.label}</a>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Oversized outlined wordmark */}
      <div aria-hidden className="pointer-events-none select-none px-4 pb-2 pt-6 opacity-[0.09] md:px-10">
        <Logo variant="wordmark" tone="light" height={260} className="!h-auto !w-full" />
      </div>

      <div className="container-lux flex flex-col gap-3 border-t border-porcelain/10 py-6 text-[0.72rem] text-porcelain/60 md:flex-row md:items-center md:justify-between">
        <p>© {year} RAVANTRA. All rights reserved.</p>
        <p className="md:text-right">
          <span className="block font-serif text-[0.95rem] italic text-porcelain/80">Designed with Intent. Developed with Passion.</span>
          <span className="mt-1 block">
            Crafted in India by{" "}
            <a href={BRAND.developer.url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
              {BRAND.developer.name}
            </a>
            .
          </span>
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="eyebrow text-gold">{title}</p>
      <ul className="mt-5 space-y-3 text-[0.92rem]">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="link-u text-porcelain/85 hover:text-porcelain">{children}</Link>
    </li>
  );
}
