"use client";

import * as React from "react";
import Link from "next/link";
import { Check, Eye, Plus } from "lucide-react";
import Image from "@/components/ui/smart-image";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatINR } from "@/lib/utils";
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
  const [added, setAdded] = React.useState(false);
  const [viewing, setViewing] = React.useState(false);
  React.useEffect(() => {
    if (!added) return;
    const t = window.setTimeout(() => setAdded(false), 1600);
    return () => window.clearTimeout(t);
  }, [added]);
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
    setAdded(true);
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
        <div className="drop-in bg-midnight/95 p-2.5 shadow-[var(--shadow-card)] backdrop-blur">
          <p className="eyebrow mb-2 px-1 text-[0.58rem] text-ink-mute">Select option</p>
          <div className="flex flex-wrap gap-1">
            {product.variants.map((v) => (
              <button
                key={v.id}
                onClick={() => add(v.id)}
                disabled={v.stock <= 0}
                title={v.label}
                className="min-w-9 border border-line-strong px-2 py-1.5 text-[0.7rem] font-medium transition-colors hover:border-blush hover:bg-burgundy hover:text-porcelain disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through"
              >
                {v.short}
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex gap-1">
        <button
          type="button"
          onClick={() => setViewing(true)}
          aria-label={`Quick view ${product.name}`}
          title="Quick view"
          className="hidden size-10 shrink-0 place-items-center bg-midnight/95 text-ink backdrop-blur transition-colors duration-300 hover:bg-white hover:text-midnight md:grid"
        >
          <Eye className="size-4" strokeWidth={1.4} />
        </button>
        <button
          onClick={() => (single ? add(product.variants[0].id) : setPicking(true))}
          className={cn(
            "flex h-10 w-full items-center justify-center gap-2 text-[0.66rem] font-semibold uppercase tracking-[0.18em] backdrop-blur transition-colors duration-300 max-md:ml-auto max-md:size-9 max-md:w-9 max-md:rounded-full max-md:p-0",
            added ? "bg-sage-deep text-porcelain" : "bg-midnight/95 text-ink hover:bg-burgundy hover:text-porcelain",
          )}
          aria-label={added ? `${product.name} added to bag` : `Quick add ${product.name}`}
        >
          {added ? <Check className="pop size-3.5" strokeWidth={1.75} /> : <Plus className="size-3.5" strokeWidth={1.5} />}
          <span className="max-md:sr-only">{added ? "Added" : single ? "Add to bag" : "Quick add"}</span>
        </button>
        </div>
      )}
      {viewing && <QuickView product={product} onClose={() => setViewing(false)} onAdd={add} added={added} />}
    </div>
  );
}

/** Quick view: the essentials of a product without leaving the grid. Mounted only while open. */
function QuickView({ product, onClose, onAdd, added }: { product: QuickAddProduct; onClose: () => void; onAdd: (variantId: string) => void; added: boolean }) {
  const firstInStock = product.variants.find((v) => v.stock > 0) ?? product.variants[0];
  const [variantId, setVariantId] = React.useState(firstInStock?.id);
  const v = product.variants.find((x) => x.id === variantId) ?? firstInStock;
  const soldOut = !v || v.stock <= 0;
  return (
    <Sheet open onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="center" title={`Quick view — ${product.name}`} className="max-w-3xl border border-line-strong bg-plum">
        <div className="grid max-h-[86dvh] overflow-y-auto sm:grid-cols-2">
          <div className="relative aspect-[4/5] bg-night sm:aspect-auto sm:min-h-[460px]">
            {product.image && <Image src={product.image} alt={product.name} fill sizes="(min-width:640px) 380px, 90vw" quality={72} className="object-cover" />}
          </div>
          <div className="flex flex-col p-7 sm:p-9">
            <p className="eyebrow text-gold">{product.division}</p>
            <h3 className="mt-3 font-serif text-[2rem] leading-[1.08] text-ink">{product.name}</h3>
            {v && (
              <p className="mt-4 flex items-baseline gap-3">
                <span className="font-serif text-2xl text-ink">{formatINR(v.price)}</span>
                {v.compareAt && <span className="text-sm text-ink-mute line-through">{formatINR(v.compareAt)}</span>}
              </p>
            )}
            {product.variants.length > 1 && (
              <div className="mt-7">
                <p className="eyebrow text-[0.6rem] text-ink-mute">Select option</p>
                <div className="mt-3 flex flex-wrap gap-1.5" role="radiogroup" aria-label="Options">
                  {product.variants.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={o.id === variantId}
                      disabled={o.stock <= 0}
                      title={o.label}
                      onClick={() => setVariantId(o.id)}
                      className={cn(
                        "min-w-11 border px-3 py-2 text-[0.75rem] font-medium transition-[background-color,border-color,color,transform] duration-300 active:scale-95 disabled:cursor-not-allowed disabled:opacity-35 disabled:line-through",
                        o.id === variantId ? "border-burgundy bg-burgundy text-white" : "border-line-strong text-ink-soft hover:border-white hover:text-white",
                      )}
                    >
                      {o.short}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <p className={cn("mt-6 flex items-center gap-2 text-xs", soldOut ? "text-danger" : "text-ink-soft")}>
              <span className={cn("size-1.5 rounded-full", soldOut ? "bg-danger" : "bg-sage-light")} aria-hidden />
              {soldOut ? "Sold out" : v.stock <= 3 ? `Only ${v.stock} left` : "In stock, ready to dispatch"}
            </p>
            <div className="mt-auto pt-8">
              <button
                type="button"
                disabled={soldOut}
                onClick={() => v && onAdd(v.id)}
                className={cn(
                  "flex h-12 w-full items-center justify-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-white transition-colors duration-300 disabled:opacity-45",
                  added ? "bg-sage-deep" : "bg-burgundy hover:bg-burgundy-deep",
                )}
              >
                {added ? <Check className="pop size-4" strokeWidth={1.75} /> : null}
                {added ? "Added to bag" : "Add to bag"}
              </button>
              <Link href={`/products/${product.slug}`} onClick={onClose} className="group mt-5 inline-flex items-center gap-2 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ink-soft transition-colors hover:text-white">
                <span className="link-u">View full details</span>
                <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
              </Link>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
