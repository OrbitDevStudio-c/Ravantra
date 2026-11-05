"use client";

import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useWishlist, wishlist } from "@/features/wishlist/store";
import { cn } from "@/lib/utils";

export function WishlistButton({ productId, name, className, withLabel }: { productId: string; name: string; className?: string; withLabel?: boolean }) {
  const ids = useWishlist();
  const saved = ids.includes(productId);
  return (
    <button
      type="button"
      onClick={() => {
        const nowSaved = wishlist.toggle(productId);
        toast(nowSaved ? `Saved “${name}” to your wishlist` : "Removed from wishlist");
      }}
      aria-pressed={saved}
      aria-label={saved ? `Remove ${name} from wishlist` : `Save ${name} to wishlist`}
      className={cn(
        "grid place-items-center transition-transform active:scale-90",
        withLabel ? "h-12 gap-2 border border-line-strong px-5 text-[0.75rem] uppercase tracking-[0.16em] hover:border-espresso" : "size-9",
        withLabel && "grid-flow-col",
        className,
      )}
    >
      <Heart className={cn("size-[17px] transition-colors", saved ? "fill-espresso text-espresso" : "text-espresso")} strokeWidth={1.25} />
      {withLabel && <span>{saved ? "Saved" : "Save"}</span>}
    </button>
  );
}
