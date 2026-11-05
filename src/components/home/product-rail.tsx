"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

/** Horizontal scroll-snap rail with arrow controls and progress line. */
export function ProductRail({ children, label }: { children: React.ReactNode; label: string }) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [progress, setProgress] = React.useState(0);
  const [edges, setEdges] = React.useState({ start: true, end: false });

  const update = React.useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    setProgress(max > 0 ? el.scrollLeft / max : 0);
    setEdges({ start: el.scrollLeft < 8, end: el.scrollLeft > max - 8 });
  }, []);

  React.useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);

  const scroll = (dir: 1 | -1) => {
    const el = ref.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div>
      <div
        ref={ref}
        onScroll={update}
        role="region"
        aria-label={label}
        tabIndex={0}
        className="no-scrollbar -mx-[clamp(1rem,4vw,3.5rem)] flex snap-x snap-mandatory gap-4 overflow-x-auto scroll-px-[clamp(1rem,4vw,3.5rem)] px-[clamp(1rem,4vw,3.5rem)] md:gap-6"
      >
        {children}
      </div>
      <div className="mt-8 flex items-center gap-6">
        <div className="relative h-px flex-1 bg-line">
          <div className="absolute inset-y-0 left-0 bg-espresso transition-[width] duration-300" style={{ width: `${Math.max(8, progress * 100)}%` }} />
        </div>
        <div className="flex gap-2">
          <button onClick={() => scroll(-1)} disabled={edges.start} aria-label="Previous" className="grid size-11 place-items-center border border-line-strong transition hover:border-espresso disabled:opacity-30">
            <ChevronLeft className="size-4" strokeWidth={1.25} />
          </button>
          <button onClick={() => scroll(1)} disabled={edges.end} aria-label="Next" className="grid size-11 place-items-center border border-line-strong transition hover:border-espresso disabled:opacity-30">
            <ChevronRight className="size-4" strokeWidth={1.25} />
          </button>
        </div>
      </div>
    </div>
  );
}
