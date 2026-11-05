import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { ArrowRight, Button } from "@/components/ui/button";
import type { Division } from "@/types";
import { img } from "@/config/demo-data";

export function Hero({ divisions }: { divisions: Division[] }) {
  return (
    <section className="relative overflow-hidden bg-ivory">
      <div className="container-lux grid min-h-[calc(100svh-110px)] grid-cols-1 gap-10 pb-10 pt-8 lg:grid-cols-12 lg:gap-6 lg:pb-14 lg:pt-10">
        {/* Copy */}
        <div className="relative z-10 flex flex-col justify-between lg:col-span-6 lg:pr-6">
          <div className="flex items-center gap-3 animate-fade-up">
            <span className="h-px w-10 bg-gold" />
            <p className="eyebrow text-mocha">A women&apos;s lifestyle house · Est. 2026</p>
          </div>

          <div className="my-10 lg:my-0">
            <h1 className="display text-[clamp(3.4rem,8.6vw,8.4rem)] text-espresso">
              <span className="line-in block overflow-hidden pb-[0.06em]"><span style={{ "--d": "80ms" } as React.CSSProperties}>Everything</span></span>
              <span className="line-in block overflow-hidden pb-[0.06em]"><span style={{ "--d": "200ms" } as React.CSSProperties}>that makes</span></span>
              <span className="line-in block overflow-hidden pb-[0.08em]">
                <span style={{ "--d": "320ms" } as React.CSSProperties}>
                  you, <em className="font-light italic text-mocha">you.</em>
                </span>
              </span>
            </h1>
            <p className="mt-8 max-w-md text-[1.02rem] leading-relaxed text-ink-soft animate-fade-up [animation-delay:500ms]">
              Discover fashion, beauty, wellness and everything in between — four houses, one considered experience.
            </p>
            <div className="mt-10 flex flex-wrap items-center gap-x-8 gap-y-4 animate-fade-up [animation-delay:650ms]">
              <Button size="lg" asChild>
                <Link href="/products">Shop now <ArrowRight /></Link>
              </Button>
              <Link href="/salon-spa" className="group inline-flex items-center gap-3 text-[0.8rem] font-medium uppercase tracking-[0.16em] text-espresso">
                <span className="link-u">Explore our experiences</span>
                <ArrowRight />
              </Link>
            </div>
          </div>

          {/* Division index */}
          <nav aria-label="Our houses" className="grid grid-cols-2 gap-x-6 border-t border-line pt-5 sm:grid-cols-4 animate-fade-up [animation-delay:800ms]">
            {divisions.map((d, i) => (
              <Link key={d.id} href={d.kind === "services" ? "/salon-spa" : `/${d.slug}`} className="group py-2">
                <span className="font-serif text-xs italic text-gold-deep">0{i + 1}</span>
                <span className="mt-1 block text-[0.8rem] uppercase tracking-[0.14em] text-espresso transition-colors group-hover:text-mocha">
                  {d.shortName}
                </span>
              </Link>
            ))}
          </nav>
        </div>

        {/* Imagery */}
        <div className="relative lg:col-span-6">
          <div className="mask-reveal relative ml-auto aspect-[4/5] w-full overflow-hidden bg-champagne sm:w-[86%] lg:h-full lg:aspect-auto">
            <Image
              src={img("1581044777550-4cfa60707c03", 1600)}
              alt="Model in a blush organza ensemble in a golden field"
              fill
              priority
              fetchPriority="high"
              sizes="(min-width:1024px) 46vw, 90vw"
              quality={70}
              className="object-cover object-[50%_30%]"
            />
          </div>

          {/* Inset image */}
          <div className="absolute -bottom-2 left-0 hidden w-[34%] border-[10px] border-ivory bg-ivory shadow-[0_30px_60px_-30px_rgba(33,27,32,0.45)] animate-fade-up [animation-delay:900ms] sm:block lg:bottom-10 lg:-left-6">
            <div className="relative aspect-[4/5] overflow-hidden">
              <Image src={img("1596462502278-27bfdc403348", 700)} alt="Beauty essentials flat-lay" fill sizes="16vw" quality={60} className="object-cover" />
            </div>
            <p className="mt-2 text-[0.6rem] uppercase tracking-[0.2em] text-ink-mute">Beauty &amp; Care — New rituals</p>
          </div>

          {/* Booking ticket */}
          <Link
            href="/salon-spa/book"
            className="group absolute right-3 top-3 flex items-center gap-4 bg-ivory/95 py-3 pl-4 pr-5 backdrop-blur animate-fade-up [animation-delay:1100ms] sm:right-6 sm:top-6"
          >
            <span className="relative grid size-2 place-items-center">
              <span className="absolute size-2 animate-ping rounded-full bg-sage/60" />
              <span className="size-2 rounded-full bg-sage" />
            </span>
            <span>
              <span className="block text-[0.6rem] uppercase tracking-[0.2em] text-ink-mute">Salon &amp; Spa</span>
              <span className="block font-serif text-lg leading-tight">Now booking online</span>
            </span>
            <span aria-hidden className="text-espresso transition-transform duration-500 group-hover:translate-x-1">→</span>
          </Link>

          <p className="vertical-text absolute -right-1 bottom-6 hidden text-[0.6rem] uppercase tracking-[0.4em] text-ink-mute xl:block">
            Fashion · Beauty · Salon &amp; Spa · Lifestyle
          </p>
        </div>
      </div>
    </section>
  );
}
