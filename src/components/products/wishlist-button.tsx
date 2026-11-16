"use client";

import * as React from "react";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useWishlist, wishlist } from "@/features/wishlist/store";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, name, className, withLabel }: { productId: string; name: string; className?: string; withLabel?: boolean }) {
  const ids = useWishlist();
  const saved = ids.includes(productId);
  // Only celebrate a save the visitor just made — never on page load for already-saved items
  const [burst, setBurst] = React.useState(false);
  return (
    <button
      type="button"
      onClick={() => {
        const nowSaved = wishlist.toggle(productId);
        setBurst(nowSaved);
        toast(nowSaved ? `Saved “${name}” to your wishlist` : "Removed from wishlist");
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={cn(
        "grid place-items-center transition-[transform,background-color] active:scale-90",
        withLabel
          ? cn("h-12 gap-2 border px-5 text-[0.72rem] font-semibold uppercase tracking-[0.16em] transition-colors", saved ? "border-blush text-blush" : "border-line-strong hover:border-ink")
          : "size-9",
        withLabel && "grid-flow-col",
        className,
      )}
    >
      <span className="relative grid place-items-center">
        <Heart key={String(saved)} className={cn("size-[17px] transition-colors", saved ? "fill-blush text-blush" : "text-ink", saved && burst && "pop")} strokeWidth={1.25} />
        {saved && burst && <span className="heart-ring" aria-hidden />}
      </span>
      {withLabel && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
