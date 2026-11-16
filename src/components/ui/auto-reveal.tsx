"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

/**
 * Gives every storefront page the homepage's scroll choreography without
 * hand-wrapping each section in <Reveal>.
 *
 * On each route it finds page sections and grid items inside <main>, and for
 * the ones that start BELOW the fold it applies the shared `.reveal` rise-in
 * (grid items get a short stagger). Content already on screen is never hidden,
 * so there is no flash and LCP is untouched. Anything that already uses
 * <Reveal> is left alone. Reduced-motion users get static content via CSS.
 */
const SECTION_SEL = "main section, main article, main [data-animate]";
const GRID_ITEM_SEL = "main [class*='grid-cols-'] > *";
const MAX_STAGGER = 4;

/** Items in sideways rails/carousels would stay hidden until swiped, so they are left static. */
function inHorizontalScroller(el: HTMLElement, root: Element) {
  for (let n = el.parentElement; n && n !== root; n = n.parentElement) {
    const ox = getComputedStyle(n).overflowX;
    if ((ox === "auto" || ox === "scroll") && n.scrollWidth > n.clientWidth + 1) return true;
  }
  return false;
}

export function AutoReveal() {
  const pathname = usePathname();

  React.useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const main = document.querySelector("main");
    if (!main) return;

    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          (e.target as HTMLElement).dataset.in = "true";
          io.unobserve(e.target);
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.06 },
    );

    const fold = window.innerHeight;
    const prepared = new Set<HTMLElement>();
    const belowFold = (el: HTMLElement) => el.getBoundingClientRect().top > fold * 0.92;
    // Skip anything already animated, inside an animated subtree, or containing animated children
    const managed = (el: HTMLElement) =>
      el.closest(".reveal, [data-no-reveal]") !== null ||
      el.querySelector(".reveal") !== null ||
      // controls (filters, forms, menus) and sticky/scrolling panels never animate
      el.matches("button, a, label, input, select, textarea") ||
      el.closest("aside, form, nav, dialog, [role='dialog'], [aria-label='Filters']") !== null ||
      inHorizontalScroller(el, main);

    // Elements prepared by a previous run (dev Strict Mode re-runs effects) are re-observed, not re-skipped
    main.querySelectorAll<HTMLElement>("[data-auto-reveal]:not([data-in='true'])").forEach((el) => io.observe(el));

    const prepare = (el: HTMLElement, delay: number) => {
      if (prepared.has(el) || managed(el) || !belowFold(el) || el.offsetHeight === 0) return;
      el.classList.add("reveal");
      el.dataset.autoReveal = "";
      el.style.setProperty("--reveal-delay", `${delay}ms`);
      prepared.add(el);
      io.observe(el);
    };

    // 1) grid items first, so their sections stay visible and the items stagger in
    main.querySelectorAll<HTMLElement>(GRID_ITEM_SEL).forEach((el) => {
      const index = Array.prototype.indexOf.call(el.parentElement?.children ?? [], el);
      prepare(el, (index % MAX_STAGGER) * 80);
    });
    // 2) whole sections that have no animated content of their own
    main.querySelectorAll<HTMLElement>(SECTION_SEL).forEach((el) => prepare(el, 0));

    return () => io.disconnect();
  }, [pathname]);

  return null;
}
