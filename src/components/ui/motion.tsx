"use client";

import * as React from "react";
import { ArrowUp } from "lucide-react";
import { cn } from "@/lib/utils";

/** Pointer effects only run with a real mouse and when the visitor hasn't asked for reduced motion. */
function canHover() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

/**
 * Magnetic wrapper for primary CTAs: the child leans a few pixels toward the
 * pointer and settles back on leave. Writes transform straight to the node
 * (no React state), and is capped so the target never moves out from under
 * the cursor.
 */
export function Magnetic({ children, strength = 0.22, max = 7, className }: { children: React.ReactNode; strength?: number; max?: number; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !canHover()) return;
    let raf = 0;
    let rect: DOMRect | null = null;
    const clamp = (v: number) => Math.max(-max, Math.min(max, v));
    const enter = () => {
      el.style.transform = "";
      rect = el.getBoundingClientRect();
    };
    const move = (e: PointerEvent) => {
      if (!rect) rect = el.getBoundingClientRect();
      const x = clamp((e.clientX - (rect.left + rect.width / 2)) * strength);
      const y = clamp((e.clientY - (rect.top + rect.height / 2)) * strength);
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        el.style.transform = `translate3d(${x.toFixed(1)}px, ${y.toFixed(1)}px, 0)`;
      });
    };
    const leave = () => {
      cancelAnimationFrame(raf);
      rect = null;
      el.style.transform = "";
    };
    el.addEventListener("pointerenter", enter);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerleave", leave);
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener("pointerenter", enter);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerleave", leave);
    };
  }, [strength, max]);
  return (
    <span ref={ref} className={cn("magnetic inline-block", className)}>
      {children}
    </span>
  );
}

/**
 * Counts a figure up from zero the first time it scrolls into view.
 * Accepts the already-formatted string ("04", "29+", "₹1,24,500", "86%") so
 * the server render is the final value — no layout shift, and nothing changes
 * for crawlers or reduced-motion visitors. Updates the text node directly.
 */
export function CountUp({ value, duration = 1400, className }: { value: string; duration?: number; className?: string }) {
  const ref = React.useRef<HTMLSpanElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    const m = value.match(/^(\D*)(\d[\d,]*(?:\.\d+)?)(.*)$/);
    if (!el || !m || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const [, prefix, raw, suffix] = m;
    const target = Number(raw.replace(/,/g, ""));
    if (!Number.isFinite(target) || target === 0) return;
    const decimals = raw.includes(".") ? raw.split(".")[1].length : 0;
    const grouped = raw.includes(",");
    const width = raw.replace(/[,.]/g, "").length;
    const format = (n: number) => {
      if (grouped) return n.toLocaleString("en-IN", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
      const fixed = n.toFixed(decimals);
      return decimals ? fixed : fixed.padStart(width, "0");
    };
    let raf = 0;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        const start = performance.now();
        const tick = (now: number) => {
          const t = Math.min(1, (now - start) / duration);
          const eased = 1 - Math.pow(1 - t, 4);
          el.textContent = prefix + format(t === 1 ? target : target * eased) + suffix;
          if (t < 1) raf = requestAnimationFrame(tick);
        };
        raf = requestAnimationFrame(tick);
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      el.textContent = value;
    };
  }, [value, duration]);
  return (
    <span ref={ref} className={cn("tabular-nums", className)}>
      {value}
    </span>
  );
}

/**
 * A small trailing ring that appears over editorial imagery marked with
 * `data-cursor="View"` (or any label). The native cursor stays, so nothing
 * about clicking changes; touch devices and reduced-motion never mount it.
 */
export function EditorialCursor() {
  const ref = React.useRef<HTMLDivElement>(null);
  React.useEffect(() => {
    const el = ref.current;
    if (!el || !canHover()) return;
    let raf = 0;
    let x = 0;
    let y = 0;
    const move = (e: PointerEvent) => {
      x = e.clientX;
      y = e.clientY;
      const host = (e.target as Element | null)?.closest?.("[data-cursor]") as HTMLElement | null;
      const label = host?.dataset.cursor ?? "";
      if (el.dataset.label !== label) {
        el.dataset.label = label;
        el.dataset.on = label ? "true" : "false";
        if (label) el.firstElementChild!.textContent = label;
      }
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.transform = `translate3d(${x}px, ${y}px, 0)`;
        });
    };
    const hide = () => {
      el.dataset.on = "false";
      el.dataset.label = "";
    };
    document.addEventListener("pointermove", move, { passive: true });
    document.addEventListener("pointerleave", hide);
    window.addEventListener("scroll", hide, { passive: true });
    return () => {
      cancelAnimationFrame(raf);
      document.removeEventListener("pointermove", move);
      document.removeEventListener("pointerleave", hide);
      window.removeEventListener("scroll", hide);
    };
  }, []);
  return (
    <div ref={ref} className="ed-cursor" data-on="false" aria-hidden>
      <span />
    </div>
  );
}

/** Appears after the first couple of screens; state only changes when the threshold is crossed. */
export function BackToTop() {
  const [show, setShow] = React.useState(false);
  React.useEffect(() => {
    const onScroll = () => {
      const next = window.scrollY > 1400;
      setShow((prev) => (prev === next ? prev : next));
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  return (
    <button
      type="button"
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      aria-label="Back to top"
      tabIndex={show ? 0 : -1}
      className={cn(
        "group fixed bottom-6 right-6 z-40 grid size-12 place-items-center rounded-full border border-line-strong bg-midnight/80 text-ink backdrop-blur-md transition-[opacity,transform,border-color,background-color] duration-500 ease-[var(--ease-lux)] hover:border-gold hover:bg-plum max-md:bottom-4 max-md:right-4 max-md:size-11",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-3 opacity-0",
      )}
    >
      <ArrowUp className="size-4 transition-transform duration-500 ease-[var(--ease-lux)] group-hover:-translate-y-0.5" strokeWidth={1.5} />
    </button>
  );
}
