import Link from "next/link";
import { BRAND } from "@/config/site";
import type { Division } from "@/types";

export function SiteFooter({ divisions }: { divisions: Division[] }) {
  const year = new Date().getFullYear();
  return (
    <footer className="relative overflow-hidden bg-espresso text-ivory">
      <div className="container-lux grid gap-14 pb-10 pt-20 md:grid-cols-12">
        <div className="md:col-span-4">
          <p className="font-serif text-3xl tracking-[0.3em]">RAVANTRA</p>
          <p className="mt-5 max-w-sm font-serif text-2xl italic leading-snug text-ivory/80">{BRAND.tagline}</p>
          <p className="mt-5 max-w-sm text-sm leading-relaxed text-ivory/55">
            Fashion, beauty, salon &amp; spa and lifestyle — four divisions, one account, one standard of care.
          </p>
          <Link href="/salon-spa/book" className="mt-8 inline-flex items-center gap-3 border border-ivory/30 px-5 py-3 text-[0.7rem] uppercase tracking-[0.2em] transition hover:border-gold hover:text-gold">
            Book an appointment <span aria-hidden>→</span>
          </Link>
        </div>
        <FooterCol title="Shop" className="md:col-span-2 md:col-start-6">
          {divisions.map((d) => (
            <FooterLink key={d.id} href={d.kind === "services" ? "/salon-spa" : `/${d.slug}`}>{d.shortName}</FooterLink>
          ))}
          <FooterLink href="/products?sort=newest">New arrivals</FooterLink>
          <FooterLink href="/products">All products</FooterLink>
        </FooterCol>
        <FooterCol title="Experiences" className="md:col-span-2">
          <FooterLink href="/salon-spa/book">Book an appointment</FooterLink>
          <FooterLink href="/salon-spa#experts">Our experts</FooterLink>
          <FooterLink href="/salon-spa#services">Service menu</FooterLink>
          <FooterLink href="/about">Our story</FooterLink>
        </FooterCol>
        <FooterCol title="Customer care" className="md:col-span-2">
          <FooterLink href="/account">My account</FooterLink>
          <FooterLink href="/account/orders">Track an order</FooterLink>
          <FooterLink href="/contact">Contact us</FooterLink>
          <FooterLink href="/contact#faq">Shipping & returns</FooterLink>
        </FooterCol>
        <div className="md:col-span-12">
          <div className="grid gap-8 border-t border-ivory/15 pt-10 text-sm text-ivory/70 md:grid-cols-3">
            <div>
              <p className="eyebrow mb-3 text-ivory/45">Visit</p>
              <p>{BRAND.contact.address}</p>
              <p className="mt-1">{BRAND.contact.hours}</p>
            </div>
            <div>
              <p className="eyebrow mb-3 text-ivory/45">Write · Call</p>
              <p>{BRAND.contact.email}</p>
              <p className="mt-1">{BRAND.contact.phone}</p>
            </div>
            <div>
              <p className="eyebrow mb-3 text-ivory/45">Follow</p>
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
      <div aria-hidden className="pointer-events-none select-none px-2">
        <p
          className="text-center font-serif text-[21vw] leading-[0.78] tracking-[0.02em] text-transparent md:text-[19vw]"
          style={{ WebkitTextStroke: "1px rgb(248 245 239 / 0.16)" }}
        >
          RAVANTRA
        </p>
      </div>

      <div className="container-lux flex flex-col gap-3 border-t border-ivory/10 py-6 text-[0.7rem] text-ivory/50 md:flex-row md:items-center md:justify-between">
        <p>© {year} RAVANTRA (fictional demo brand). All products, people, reviews and orders shown are illustrative.</p>
        <p>
          Designed &amp; developed by{" "}
          <a href={BRAND.developer.url} target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">
            {BRAND.developer.name}
          </a>
        </p>
      </div>
    </footer>
  );
}

function FooterCol({ title, children, className }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <p className="eyebrow text-ivory/45">{title}</p>
      <ul className="mt-5 space-y-3 text-[0.92rem]">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="link-u text-ivory/85 hover:text-ivory">{children}</Link>
    </li>
  );
}
