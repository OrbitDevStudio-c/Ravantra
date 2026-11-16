"use client";

import * as React from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { SHIPPING_RULES } from "@/config/site";
import { formatINR } from "@/lib/utils";

const MESSAGES: { text: string; href?: string }[] = [
  { text: `Complimentary shipping on orders above ${formatINR(SHIPPING_RULES.freeAbove)}` },
  { text: "Salon & Spa appointments now bookable online", href: "/salon-spa/book" },
  { text: "One account across fashion, beauty & lifestyle", href: "/register" },
  { text: "Every order arrives gift-wrapped" },
];

const INTERVAL = 5200;

/** A single, quietly rotating message. Pauses on hover/focus; static under reduced motion. */
export function AnnouncementBar() {
  const [i, setI] = React.useState(0);
  const [paused, setPaused] = React.useState(false);

  React.useEffect(() => {
    if (paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setTimeout(() => setI((n) => (n + 1) % MESSAGES.length), INTERVAL);
    return () => window.clearTimeout(t);
  }, [i, paused]);

  const go = (d: number) => setI((n) => (n + d + MESSAGES.length) % MESSAGES.length);
  const m = MESSAGES[i];

  return (
    <div
      role="region"
      aria-label="Store announcements"
      className="relative z-[51] bg-obsidian text-porcelain/85"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="container-lux flex h-9 items-center justify-between gap-4">
        <button type="button" onClick={() => go(-1)} aria-label="Previous announcement" className="grid size-7 place-items-center text-porcelain/50 transition-colors hover:text-porcelain">
          <ChevronLeft className="size-3.5" strokeWidth={1.5} />
        </button>
        <p className="min-w-0 flex-1 text-center text-[0.66rem] font-medium uppercase tracking-[0.2em]" aria-live={paused ? "polite" : "off"}>
          <span key={i} className="drop-in inline-flex max-w-full items-center gap-3 truncate">
            <span className="size-1 shrink-0 rotate-45 bg-gold" aria-hidden />
            {m.href ? (
              <Link href={m.href} className="truncate underline-offset-4 hover:text-porcelain hover:underline">
                {m.text}
              </Link>
            ) : (
              <span className="truncate">{m.text}</span>
            )}
          </span>
        </p>
        <button type="button" onClick={() => go(1)} aria-label="Next announcement" className="grid size-7 place-items-center text-porcelain/50 transition-colors hover:text-porcelain">
          <ChevronRight className="size-3.5" strokeWidth={1.5} />
        </button>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gold/25" aria-hidden />
    </div>
  );
}
