import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { ArrowRight, Button } from "@/components/ui/button";
import { Magnetic } from "@/components/ui/motion";
import type { Division } from "@/types";
import { BEAUTY_IMG, FASHION_IMG } from "@/config/demo-data";

export function Hero({ divisions }: { divisions: Division[] }) {
  return (
    <section className="relative overflow-hidden bg-midnight">
      <div className="container-lux grid min-h-[calc(100svh-110px)] grid-cols-1 gap-10 pb-10 pt-8 lg:grid-cols-12 lg:gap-6 lg:pb-14 lg:pt-10">
        {/* Copy */}
        <div className="relative z-10 flex flex-col justify-between lg:col-span-6 lg:pr-6">
          <div className="flex items-center gap-3 animate-fade-up">
            <span className="h-px w-10 bg-gold" aria-hidden />
            <p className="eyebrow text-gold">Midnight luxury · Est. 2026</p>
          </div>

          <div className="my-10 lg:my-0">
            <h1 className="display display-xl text-ink">
              {/* Word-by-word rise; each word sits in its own clipping line box */}
              <span className="block">
                <Word d={80}>Everything</Word>
              </span>
              <span className="block">
                <Word d={200}>that</Word> <Word d={300}>makes</Word>
              </span>
              <span className="block">
                <Word d={420}>you,</Word>{" "}
                <Word d={560}>
                  <em className="text-gradient silk-flow font-light italic">you.</em>
                </Word>
              </span>
            </h1>
            <p className="mt-8 max-w-md text-[1.02rem] leading-[1.75] text-ink-soft animate-fade-up [animation-delay:500ms]">
              Discover fashion, beauty, wellness and everything in between — four houses, one considered experience.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 animate-fade-up [animation-delay:650ms]">
              <Magnetic>
                <Button size="lg" asChild>
                  <Link href="/products">Shop now <ArrowRight /></Link>
                </Button>
              </Magnetic>
              <Link href="/salon-spa" className="group inline-flex items-center gap-3 text-[0.75rem] font-semibold uppercase tracking-[0.18em] text-ink transition-colors hover:text-blush">
                <span className="link-u">Explore our experiences</span>
                <ArrowRight />
              </Link>
            </div>
          </div>

          {/* Division index */}
          <nav aria-label="Our houses" className="grid grid-cols-2 gap-x-6 border-t border-line pt-5 sm:grid-cols-4 animate-fade-up [animation-delay:800ms]">
            {divisions.map((d, i) => (
              <Link key={d.id} href={d.kind === "services" ? "/salon-spa" : `/${d.slug}`} className="group py-2">
                <span className="font-serif text-xs italic text-gold">0{i + 1}</span>
                <span className="mt-1 block text-[0.75rem] font-medium uppercase tracking-[0.16em] text-ink transition-colors group-hover:text-blush">
                  {d.shortName}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Imagery */}
        <div className="relative lg:col-span-6">
          <div className="mask-reveal hero-settle relative ml-auto aspect-[4/5] w-full overflow-hidden bg-rose-soft sm:w-[86%] lg:h-full lg:aspect-auto">
            <span className="pointer-events-none absolute inset-3 z-10 border border-gold/45" aria-hidden />
            <span className="pointer-events-none absolute inset-0 z-[5] bg-gradient-to-t from-midnight/60 via-midnight/5 to-midnight/15" aria-hidden />
            <Image
              src={FASHION_IMG.lavenderSaree}
              alt="Lavender tissue silk saree with a hand-embellished blouse"
              fill
              priority
              fetchPriority="high"
              sizes="(min-width:1024px) 46vw, 90vw"
              quality={70}
              className="object-cover object-[50%_22%]"
            />
          </div>

          {/* Inset image */}
          <Link
            href="/beauty"
            style={{ "--d": "900ms" } as React.CSSProperties}
            className="spring-in group absolute -bottom-2 left-0 hidden w-[34%] sm:block lg:bottom-10 lg:-left-6"
          >
            {/* entrance on the link, drift on the card — two transforms, two elements */}
            <div className="float-soft border border-white/10 bg-midnight/70 p-2.5 shadow-[var(--shadow-float)] backdrop-blur-md">
            <div className="img-zoom relative aspect-[4/5] overflow-hidden bg-rose-soft">
              <Image src={BEAUTY_IMG.flatLay} alt="Beauty essentials flat-lay" fill sizes="(min-width:640px) 18vw, 34vw" quality={60} className="object-cover" />
            </div>
            <div className="flex items-center justify-between gap-2 px-1 pb-1 pt-3">
              <span>
                <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-blush">Beauty &amp; Care</span>
                <span className="block font-serif text-[1.05rem] leading-tight text-ink">New rituals</span>
              </span>
              <span aria-hidden className="text-ink transition-transform duration-500 group-hover:translate-x-1">→</span>
            </div>
            </div>
          </Link>

          {/* Booking ticket */}
          <Link
            href="/salon-spa/book"
            className="group absolute right-3 top-3 z-20 flex items-center gap-4 border border-white/10 bg-midnight/65 py-3 pl-4 pr-5 shadow-[var(--shadow-float)] backdrop-blur-md animate-[drop-in_0.9s_var(--ease-lux)_1.25s_both] sm:right-6 sm:top-6"
          >
            <span className="relative grid size-2 place-items-center">
              <span className="absolute size-2 animate-ping rounded-full bg-sage/60 [animation-delay:1.6s] [animation-fill-mode:both] [animation-iteration-count:3]" />
              <span className="size-2 rounded-full bg-sage" />
            </span>
            <span>
              <span className="block text-[0.58rem] font-semibold uppercase tracking-[0.2em] text-sage-light">Salon &amp; Spa</span>
              <span className="block font-serif text-lg leading-tight">Now booking online</span>
            </span>
            <span aria-hidden className="text-ink transition-transform duration-500 group-hover:translate-x-1">→</span>
          </Link>

          <p className="vertical-text absolute -right-1 bottom-6 hidden text-[0.6rem] uppercase tracking-[0.4em] text-ink-mute xl:block">
            Fashion · Beauty · Salon &amp; Spa · Lifestyle
          </p>
        </div>
      </div>
    </section>
  );
}

/** One headline word that rises out of its own clipped line box. */
function Word({ children, d }: { children: React.ReactNode; d: number }) {
  return (
    <span className="line-in inline-block overflow-hidden pb-[0.1em] align-bottom">
      <span style={{ "--d": `${d}ms` } as React.CSSProperties}>{children}</span>
    </span>
  );
}
