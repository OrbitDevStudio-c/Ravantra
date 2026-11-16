import Image from "@/components/ui/smart-image";
import Link from "next/link";
import type { Division } from "@/types";
import { ArrowLink, SectionHeading } from "@/components/ui/primitives";
import { Reveal } from "@/components/ui/reveal";

/**
 * "Explore our businesses" — CSS-only expanding panels on desktop
 * (hovered panel grows), stacked editorial cards on mobile.
 */
/** Each house keeps its own accent on hover. */
const ACCENT_BG: Record<string, string> = { fashion: "bg-blush", beauty: "bg-rose", "salon-spa": "bg-sage-light", lifestyle: "bg-gold" };

export function DivisionsShowcase({ divisions, counts }: { divisions: Division[]; counts: Record<string, string> }) {
  return (
    <section className="section">
      <div className="container-lux">
        <Reveal>
          <SectionHeading
            index="I."
            eyebrow="Explore our businesses"
            title={
              <>
                Four houses. <em className="italic text-gradient">One you.</em>
              </>
            }
            description="Each RAVANTRA division is run by its own specialists — united by one standard of craft, and one account for everything."
            action={<ArrowLink href="/divisions">Explore all four</ArrowLink>}
          />
        </Reveal>

        <Reveal variant="group" className="mt-14 hidden h-[640px] gap-3 lg:flex">
          {divisions.map((d, i) => (
            <Link
              key={d.id}
              href={d.kind === "services" ? "/salon-spa" : `/${d.slug}`}
              data-cursor="Explore"
              style={{ "--i": i } as React.CSSProperties}
              className="group relative flex-1 overflow-hidden bg-obsidian transition-[flex-grow] duration-[900ms] ease-[var(--ease-lux)] hover:flex-[2.3] focus-visible:flex-[2.3]"
            >
              <Image
                src={d.heroImage}
                alt=""
                fill
                sizes="(min-width:1024px) 45vw, 100vw"
                quality={65}
                className="object-cover opacity-90 transition-[transform,opacity] duration-[1400ms] ease-[var(--ease-lux)] group-hover:scale-[1.04] group-hover:opacity-100"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-midnight/90 via-midnight/15 to-transparent" />
              <span className="border-gradient pointer-events-none absolute inset-0 z-10 opacity-0 transition-opacity duration-700 group-hover:opacity-100 group-focus-visible:opacity-100" aria-hidden />
              <span className="absolute left-6 top-6 font-serif text-lg italic text-porcelain/85">0{i + 1}</span>
              <span className="absolute right-6 top-6 text-[0.6rem] uppercase tracking-[0.22em] text-porcelain/70">{counts[d.id]}</span>
              <span className={`accent-rule z-20 ${ACCENT_BG[d.slug] ?? "bg-blush"}`} aria-hidden />
              <div className="absolute inset-x-6 bottom-7 text-porcelain transition-transform duration-700 ease-[var(--ease-lux)] group-hover:-translate-y-1.5">
                <p className="eyebrow mb-3 text-gold">{d.subBrand ? `${d.shortName} · by RAVANTRA` : d.kind === "services" ? "Experiences" : "Shop"}</p>
                <h3 className={d.subBrand ? "font-serif text-[2.6rem] leading-none tracking-[0.18em]" : "font-serif text-[2.6rem] leading-none"}>{d.subBrand ?? d.shortName}</h3>
                <div className="grid grid-rows-[0fr] transition-[grid-template-rows] duration-700 ease-[var(--ease-lux)] group-hover:grid-rows-[1fr] group-focus-visible:grid-rows-[1fr]">
                  <div className="overflow-hidden">
                    <p className="mt-4 max-w-sm text-sm leading-relaxed text-porcelain/80">{d.description}</p>
                    <span className="mt-5 inline-flex items-center gap-3 text-[0.7rem] uppercase tracking-[0.2em]">
                      Explore <span aria-hidden className="inline-block transition-transform duration-700 ease-[var(--ease-lux)] group-hover:translate-x-1.5">→</span>
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </Reveal>

        {/* Mobile / tablet */}
        <div className="mt-12 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:hidden">
          {divisions.map((d, i) => (
            <Reveal key={d.id} delay={i * 80}>
              <Link href={d.kind === "services" ? "/salon-spa" : `/${d.slug}`} className="group relative block aspect-[4/5] overflow-hidden bg-obsidian">
                <Image src={d.heroImage} alt="" fill sizes="(min-width:640px) 50vw, 100vw" quality={60} className="object-cover opacity-90" />
                <div className="absolute inset-0 bg-gradient-to-t from-obsidian/80 to-transparent" />
                <span className="absolute left-5 top-5 font-serif italic text-porcelain/85">0{i + 1}</span>
                <div className="absolute inset-x-5 bottom-5 text-porcelain">
                  <h3 className="font-serif text-4xl">{d.subBrand ?? d.shortName}</h3>
                  <p className="mt-2 text-sm text-porcelain/80">{d.tagline}</p>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
