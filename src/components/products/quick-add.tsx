"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { toast } from "sonner";
import { cart, cartDrawer } from "@/features/cart/store";
import { cn } from "@/lib/utils";

export interface QuickAddProduct {
  productId: string;
  slug: string;
  name: string;
  image: string;
  division: string;
  variants: { id: string; label: string; short: string; stock: number; price: number; compareAt: number | null }[];
}

/** Hover panel on product cards: one tap for single-variant items, size chips otherwise. */
export function QuickAdd({ product }: { product: QuickAddProduct }) {
  const [picking, setPicking] = React.useState(false);
  const single = product.variants.length === 1;

  const add = (variantId: string) => {
    const v = product.variants.find((x) => x.id === variantId);
    if (!v || v.stock <= 0) return;
    cart.add({
      variantId: v.id,
      productId: product.productId,
      slug: product.slug,
      name: product.name,
      variantLabel: v.label,
      image: product.image,
      unitPrice: v.price,
      compareAt: v.compareAt,
      maxQty: v.stock,
      division: product.division,
    });
    setPicking(false);
    toast.success(`Added to bag — ${product.name}`, { action: { label: "View bag", onClick: () => cartDrawer.open() } });
  };

  return (
    <div
      className={cn(
        "absolute inset-x-2 bottom-2 translate-y-[calc(100%+0.5rem)] transition-transform duration-500 ease-[var(--ease-lux)] group-hover:translate-y-0 group-focus-within:translate-y-0",
        picking && "translate-y-0",
        "max-md:translate-y-0",
      )}
      onMouseLeave={() => setPicking(false)}
    >
      {picking && !single ? (
        <div className="bg-ivory/95 p-2 backdrop-blur">
          <p className="eyebrow mb-2 px-1 text-[0.58rem] text-ink-mute">Select option</p>
          <div className="flex flex-wrap gap-1">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => add(v.id)}
                disabled={v.stock <= 0}
                title={v.label}
                className="min-w-9 border border-line-strong px-2 py-1.5 text-[0.7rem] transition hover:border-espresso hover:bg-espresso hover:text-ivory disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through"
              >
                {v.short}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <button
          onClick={() => (single ? add(product.variants[0].id) : setPicking(true))}
          className="flex h-10 w-full items-center justify-center gap-2 bg-ivory/95 text-[0.68rem] uppercase tracking-[0.18em] text-espresso backdrop-blur transition hover:bg-espresso hover:text-ivory max-md:ml-auto max-md:size-9 max-md:w-9 max-md:rounded-full max-md:p-0"
          aria-label={`Quick add ${product.name}`}
        >
          <Plus className="size-3.5" strokeWidth={1.5} />
          <span className="max-md:sr-only">{single ? "Add to bag" : "Quick add"}</span>
        </button>
      )}
    </div>
  );
}
