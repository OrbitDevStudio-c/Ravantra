"use client";

import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Progressive "load more" for server-rendered product cards.
 * Cards are rendered on the server; this only controls how many are shown,
 * so there is no extra request and no layout shift for the visible rows.
 */
export function LoadMoreGrid({
  children,
  pageSize = 12,
  className,
  noun = "pieces",
}: {
  children: React.ReactNode[];
  pageSize?: number;
  className?: string;
  noun?: string;
}) {
  const total = children.length;
  const [shown, setShown] = React.useState(Math.min(pageSize, total));
  const firstNew = React.useRef<HTMLDivElement>(null);
  const [focusIndex, setFocusIndex] = React.useState<number | null>(null);

  React.useEffect(() => {
    // Move keyboard focus to the first newly revealed card for screen-reader & keyboard users
    if (focusIndex == null) return;
    firstNew.current?.querySelector<HTMLAnchorElement>("a[href]")?.focus({ preventScroll: true });
  }, [focusIndex]);

  const more = () => {
    setFocusIndex(shown);
    setShown((n) => Math.min(n + pageSize, total));
  };

  return (
    <>
      <div className={cn("animate-[fade-in_.45s_ease]", className)}>
        {children.slice(0, shown).map((child, i) => (
          <div key={i} ref={i === focusIndex ? firstNew : undefined} className={cn(i >= pageSize && "animate-fade-up")} style={i >= pageSize ? { animationDelay: `${(i % 4) * 70}ms` } : undefined}>
            {child}
          </div>
        ))}
      </div>
      {total > pageSize && (
        <div className="mt-16 flex flex-col items-center gap-5">
          <p className="text-xs text-ink-mute" aria-live="polite">
            Showing {shown} of {total} {noun}
          </p>
          <div className="h-px w-48 overflow-hidden bg-line" aria-hidden>
            <div className="h-full bg-burgundy transition-[width] duration-700 ease-[var(--ease-lux)]" style={{ width: `${(shown / total) * 100}%` }} />
          </div>
          {shown < total && (
            <button
              type="button"
              onClick={more}
              className="h-11 border border-ink/70 px-8 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ink transition-colors duration-300 hover:border-ink hover:bg-white hover:text-midnight"
            >
              Load more
            </button>
          )}
        </div>
      )}
    </>
  );
}
