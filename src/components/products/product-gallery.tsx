"use client";

import * as React from "react";
import Image from "@/components/ui/smart-image";
import type { ProductImage } from "@/types";
import { cn } from "@/lib/utils";

/** Desktop: editorial stacked grid. Mobile: snap carousel with counter. */
export function ProductGallery({ images, name }: { images: ProductImage[]; name: string }) {
  const [index, setIndex] = React.useState(0);
  const ref = React.useRef<HTMLDivElement>(null);

  const onScroll = () => {
    const el = ref.current;
    if (!el) return;
    setIndex(Math.round(el.scrollLeft / el.clientWidth));
  };

  if (!images.length) return <div className="aspect-[3/4] bg-champagne" />;

  return (
    <>
      {/* Mobile carousel */}
      <div className="relative -mx-4 md:hidden">
        <div ref={ref} onScroll={onScroll} className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto">
          {images.map((im, i) => (
            <div key={im.id} className="relative aspect-[3/4] w-full shrink-0 snap-center bg-champagne">
              <Image src={im.url} alt={im.alt || name} fill priority={i === 0} sizes="100vw" quality={70} className="object-cover" />
            </div>
          ))}
        </div>
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5">
            {images.map((im, i) => (
              <span key={im.id} className={cn("h-0.5 w-6 transition-colors", i === index ? "bg-espresso" : "bg-espresso/25")} />
            ))}
          </div>
        )}
      </div>

      {/* Desktop editorial grid */}
      <div className="hidden gap-3 md:grid md:grid-cols-2">
        {images.map((im, i) => (
          <div
            key={im.id}
            className={cn("group img-zoom relative overflow-hidden bg-champagne", i === 0 ? "col-span-2 aspect-[4/5]" : "aspect-[3/4]", images.length === 2 && i === 1 && "col-span-2 aspect-[4/3]")}
          >
            <Image
              src={im.url}
              alt={im.alt || name}
              fill
              priority={i === 0}
              sizes={i === 0 ? "(min-width:1024px) 55vw, 100vw" : "(min-width:1024px) 28vw, 50vw"}
              quality={72}
              className="object-cover"
            />
          </div>
        ))}
      </div>
    </>
  );
}
