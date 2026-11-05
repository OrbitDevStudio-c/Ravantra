"use client";

import * as React from "react";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import type { Service } from "@/types";
import { cn, formatINR } from "@/lib/utils";

/** Salon "menu card": dotted leaders, hover swaps the preview image. */
export function ServicesMenu({ services }: { services: Service[] }) {
  const [active, setActive] = React.useState(0);
  return (
    <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
      <div className="relative hidden lg:col-span-5 lg:block">
        <div className="sticky top-28"><div className="relative aspect-[4/5] overflow-hidden bg-champagne">
          {services.map((s, i) => (
            <Image
              key={s.id}
              src={s.image}
              alt={s.name}
              fill
              sizes="38vw"
              quality={60}
              loading={i === 0 ? "eager" : "lazy"}
              className={cn(
                "object-cover transition-[opacity,transform] duration-[900ms] ease-[var(--ease-lux)]",
                i === active ? "scale-100 opacity-100" : "scale-[1.04] opacity-0",
              )}
            />
          ))}
          <span className="absolute bottom-5 left-5 bg-ivory/90 px-3 py-1.5 text-[0.62rem] uppercase tracking-[0.2em]">
            {services[active]?.category} · {services[active]?.durationMin} min
          </span>
        </div></div>
      </div>
      <ol className="lg:col-span-7">
        {services.map((s, i) => (
          <li key={s.id} onMouseEnter={() => setActive(i)} onFocus={() => setActive(i)} className="group border-b border-line first:border-t">
            <div className="flex flex-col gap-4 py-7 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-3">
                  <span className="font-serif text-sm italic text-gold-deep">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="font-serif text-[1.75rem] leading-tight text-espresso transition-transform duration-500 ease-[var(--ease-lux)] group-hover:translate-x-1">
                    {s.name}
                  </h3>
                  <span aria-hidden className="mx-2 hidden h-px flex-1 translate-y-[-0.3em] border-b border-dotted border-line-strong sm:block" />
                  <span className="hidden font-serif text-2xl text-espresso sm:block">{formatINR(s.price)}</span>
                </div>
                <p className="mt-2 max-w-xl pl-8 text-sm leading-relaxed text-ink-soft">{s.description}</p>
                <p className="mt-3 pl-8 text-[0.68rem] uppercase tracking-[0.18em] text-ink-mute">
                  {s.category} · {s.durationMin} minutes
                  <span className="ml-3 font-serif text-base normal-case tracking-normal text-espresso sm:hidden">{formatINR(s.price)}</span>
                </p>
              </div>
              <Link
                href={`/salon-spa/book?service=${s.slug}`}
                className="ml-8 inline-flex h-10 shrink-0 items-center justify-center border border-espresso px-5 text-[0.68rem] uppercase tracking-[0.18em] transition hover:bg-espresso hover:text-ivory sm:ml-0"
              >
                Book
              </Link>
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
