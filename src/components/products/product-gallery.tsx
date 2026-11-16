"use client";

import * as React from "react";
import Image from "@/components/ui/smart-image";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ProductImage } from "@/types";
import { cn } from "@/lib/utils";

/**
 * Desktop: thumbnail rail + large main image with cursor-follow zoom.
 * Mobile: swipeable snap carousel with progress ticks and a thumbnail strip.
 */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = React.useState(0);
  const [zoom, setZoom] = React.useState<{ x: number; y: number } | null>(null);
  const track = React.useRef<HTMLDivElement>(null);
  const count = images.length;

  const go = React.useCallback(
    (i: number) => {
      const next = (i + count) % count;
      setIndex(next);
      const el = track.current;
      if (el && el.offsetParent !== null) el.scrollTo({ left: next * el.clientWidth, behavior: "smooth" });
    },
    [count],
  );

  const onScroll = () => {
    const el = track.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / el.clientWidth);
    if (i !== index) setIndex(i);
  };

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.pointerType !== "mouse") return;
    const r = e.currentTarget.getBoundingClientRect();
    setZoom({ x: ((e.clientX - r.left) / r.width) * 100, y: ((e.clientY - r.top) / r.height) * 100 });
  };

  if (!count) return <div className="aspect-[3/4] bg-rose-soft" />;
  const current = images[index] ?? images[0];

  return (
    <div
      role="region"
      aria-roledescription="carousel"
      aria-label={`${name} images`}
      onKeyDown={(e) => {
        if (count < 2) return;
        if (e.key === "ArrowRight") go(index + 1);
        if (e.key === "ArrowLeft") go(index - 1);
      }}
    >
      {/* Mobile carousel */}
      <div className="md:hidden">
        <div className="relative -mx-[clamp(1rem,4vw,3.5rem)]">
          <div ref={track} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
            {images.map((im, i) => (
              <div key={im.id} className="relative aspect-[3/4] w-full shrink-0 snap-center bg-rose-soft" aria-hidden={i !== index}>
                <Image src={im.url} alt={im.alt || name} fill priority={i === 0} sizes="100vw" quality={72} className="object-cover" />
              </div>
            ))}
          </div>
          {count > 1 && (
            <>
              <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5" aria-hidden>
                {images.map((im, i) => (
                  <span key={im.id} className={cn("h-0.5 transition-all duration-500", i === index ? "w-8 bg-midnight" : "w-4 bg-midnight/45")} />
                ))}
              </div>
              <span className="absolute right-4 top-4 bg-obsidian/60 px-2 py-0.5 text-[0.62rem] font-semibold tabular-nums tracking-[0.14em] text-porcelain backdrop-blur-sm">
                {index + 1} / {count}
              </span>
            </>
          )}
        </div>
        {count > 1 && (
          <div className="no-scrollbar mt-3 flex gap-2 overflow-x-auto">
            {images.map((im, i) => (
              <Thumb key={im.id} im={im} name={name} i={i} active={i === index} onSelect={() => go(i)} className="w-16" />
            ))}
          </div>
        )}
      </div>

      {/* Desktop: rail + main */}
      <div className={cn("hidden gap-4 md:grid", count > 1 ? "md:grid-cols-[76px_1fr] lg:grid-cols-[88px_1fr]" : "md:grid-cols-1")}>
        {count > 1 && (
          <div className="no-scrollbar flex max-h-[min(78vh,760px)] flex-col gap-3 overflow-y-auto" aria-label="Choose image">
            {images.map((im, i) => (
              <Thumb key={im.id} im={im} name={name} i={i} active={i === index} onSelect={() => go(i)} />
            ))}
          </div>
        )}
        <div
          className="group relative aspect-[4/5] cursor-zoom-in overflow-hidden bg-rose-soft"
          onPointerMove={onMove}
          onPointerLeave={() => setZoom(null)}
        >
          {images.map((im, i) => (
            <Image
              key={im.id}
              src={im.url}
              alt={i === index ? im.alt || name : ""}
              fill
              priority={i === 0}
              loading={i === 0 ? undefined : "lazy"}
              sizes="(min-width:1024px) 52vw, 60vw"
              quality={80}
              className={cn(
                "object-cover transition-[opacity,transform] duration-700 ease-[var(--ease-lux)]",
                i === index ? "opacity-100" : "opacity-0",
                i === index && zoom && "scale-[1.9] duration-300",
              )}
              style={i === index && zoom ? { transformOrigin: `${zoom.x}% ${zoom.y}%` } : undefined}
            />
          ))}
          {count > 1 && (
            <>
              <GalleryArrow side="left" onClick={() => go(index - 1)} />
              <GalleryArrow side="right" onClick={() => go(index + 1)} />
              <span className="absolute bottom-4 left-4 bg-midnight/90 px-2.5 py-1 text-[0.62rem] font-semibold tabular-nums tracking-[0.16em] text-ink" aria-live="polite">
                {index + 1} / {count}
              </span>
            </>
          )}
          <span className="pointer-events-none absolute bottom-4 right-4 text-[0.6rem] font-semibold uppercase tracking-[0.2em] text-porcelain opacity-0 drop-shadow transition-opacity duration-500 group-hover:opacity-100" aria-hidden>
            Hover to zoom
          </span>
          <span className="sr-only">{current.alt || name}</span>
        </div>
      </div>
    </div>
  );
}

function Thumb({ im, name, i, active, onSelect, className }: { im: ProductImage; name: string; i: number; active: boolean; onSelect: () => void; className?: string }) {
  return (
    <button
      type="button"
      aria-current={active ? "true" : undefined}
      aria-label={`Show image ${i + 1}`}
      onClick={onSelect}
      onMouseEnter={onSelect}
      className={cn(
        "relative aspect-[3/4] shrink-0 overflow-hidden bg-rose-soft transition-[opacity,box-shadow] duration-300",
        active ? "opacity-100 ring-1 ring-ink ring-offset-2 ring-offset-midnight" : "opacity-55 hover:opacity-100",
        className,
      )}
    >
      <Image src={im.url} alt={`${name} — view ${i + 1}`} fill sizes="88px" quality={50} className="object-cover" />
    </button>
  );
}

function GalleryArrow({ side, onClick }: { side: "left" | "right"; onClick: () => void }) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      aria-label={side === "left" ? "Previous image" : "Next image"}
      className={cn(
        "absolute top-1/2 grid size-11 -translate-y-1/2 place-items-center rounded-full bg-midnight/90 text-ink opacity-0 shadow-[var(--shadow-card)] backdrop-blur transition-[opacity,background-color] duration-300 hover:bg-midnight focus-visible:opacity-100 group-hover:opacity-100",
        side === "left" ? "left-4" : "right-4",
      )}
    >
      <Icon className="size-4" strokeWidth={1.5} />
    </button>
  );
}
