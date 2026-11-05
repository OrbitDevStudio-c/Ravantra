"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight scroll reveal — one shared IntersectionObserver, CSS transitions,
 * no animation library. Respects prefers-reduced-motion via CSS.
 */
let observer: IntersectionObserver | null = null;
function getObserver() {
  if (typeof window === "undefined") return null;
  if (!observer) {
    observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            (e.target as HTMLElement).dataset.in = "true";
            observer?.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
  }
  return observer;
}

export function Reveal({
  as: Tag = "div",
  delay = 0,
  className,
  children,
  ...rest
}: {
  as?: React.ElementType;
  delay?: number;
  className?: string;
  children: React.ReactNode;
} & React.HTMLAttributes<HTMLElement>) {
  const ref = React.useRef<HTMLElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    const obs = getObserver();
    if (!el || !obs) return;
    obs.observe(el);
    return () => obs.unobserve(el);
  }, []);
  return (
    <Tag ref={ref} className={cn("reveal", className)} style={{ "--reveal-delay": `${delay}ms` } as React.CSSProperties} {...rest}>
      {children}
    </Tag>
  );
}
