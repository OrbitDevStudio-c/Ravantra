"use client";

import * as React from "react";
import { toast } from "sonner";
import { Check, Truck, RotateCcw, ShieldCheck } from "lucide-react";
import type { ProductVariant } from "@/types";
import { Button } from "@/components/ui/button";
import { QtyStepper } from "@/components/cart/cart-drawer";
import { WishlistButton } from "./wishlist-button";
import { cart, cartDrawer } from "@/features/cart/store";
import { cn, discountPercent, formatINR } from "@/lib/utils";

type Dim = "color" | "size" | "volume";

export interface PurchaseProps {
  productId: string;
  slug: string;
  name: string;
  image: string;
  division: string;
  basePrice: number;
  baseSale: number | null;
  variants: ProductVariant[];
}

function priceOf(p: PurchaseProps, v?: ProductVariant) {
  if (v && v.price != null) return { price: v.salePrice ?? v.price, compareAt: v.salePrice != null ? v.price : null };
  const sale = v?.salePrice ?? p.baseSale;
  return { price: sale ?? p.basePrice, compareAt: sale != null ? p.basePrice : null };
}

export function ProductPurchase(props: PurchaseProps) {
  const variants = props.variants.filter((v) => v.isActive);
  const dims = (["color", "size", "volume"] as Dim[]).filter((d) => variants.some((v) => v[d]));
  const firstInStock = variants.find((v) => v.stock > 0) ?? variants[0];

  const [sel, setSel] = React.useState<Partial<Record<Dim, string>>>(() =>
    Object.fromEntries(dims.map((d) => [d, firstInStock?.[d] ?? undefined])),
  );
  const [qty, setQty] = React.useState(1);
  const [added, setAdded] = React.useState(false);

  const match = variants.find((v) => dims.every((d) => v[d] === sel[d])) ?? (dims.length === 0 ? variants[0] : undefined);
  const { price, compareAt } = priceOf(props, match);
  const off = compareAt ? discountPercent(compareAt, price) : 0;
  const stock = match?.stock ?? 0;

  const options = (d: Dim) => [...new Set(variants.map((v) => v[d]).filter(Boolean) as string[])];
  const optionState = (d: Dim, value: string) => {
    const candidates = variants.filter((v) => v[d] === value && dims.every((o) => o === d || !sel[o] || v[o] === sel[o]));
    return { exists: candidates.length > 0, inStock: candidates.some((v) => v.stock > 0) };
  };

  const choose = (d: Dim, value: string) => {
    setSel((prev) => {
      const next = { ...prev, [d]: value };
      // if the combination doesn't exist, snap other dimensions to a valid variant
      if (!variants.some((v) => dims.every((o) => v[o] === next[o]))) {
        const v = variants.find((x) => x[d] === value && x.stock > 0) ?? variants.find((x) => x[d] === value);
        if (v) dims.forEach((o) => (next[o] = v[o] ?? undefined));
      }
      return next;
    });
    setQty(1);
  };

  const add = () => {
    if (!match || stock <= 0) return;
    cart.add(
      {
        variantId: match.id,
        productId: props.productId,
        slug: props.slug,
        name: props.name,
        variantLabel: [match.color, match.size, match.volume].filter(Boolean).join(" · ") || match.name,
        image: props.image,
        unitPrice: price,
        compareAt,
        maxQty: stock,
        division: props.division,
      },
      qty,
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 1800);
    toast.success("Added to your bag", { action: { label: "View bag", onClick: () => cartDrawer.open() } });
  };

  const labels: Record<Dim, string> = { color: "Colour", size: "Size", volume: "Size" };

  return (
    <div>
      <div className="flex items-baseline gap-3">
        <span className="font-serif text-[2rem] leading-none text-espresso">{formatINR(price)}</span>
        {compareAt && (
          <>
            <span className="text-ink-mute line-through">{formatINR(compareAt)}</span>
            <span className="bg-espresso px-2 py-0.5 text-[0.62rem] uppercase tracking-[0.14em] text-ivory">Save {off}%</span>
          </>
        )}
      </div>
      <p className="mt-1 text-xs text-ink-mute">Inclusive of all taxes</p>

      <div className="mt-8 space-y-7">
        {dims.map((d) => (
          <fieldset key={d}>
            <legend className="mb-3 flex w-full items-center justify-between">
              <span className="eyebrow text-espresso">
                {labels[d]}: <span className="normal-case tracking-normal text-ink-soft">{sel[d]}</span>
              </span>
              {d === "size" && options("size").some((s) => ["XS", "S", "M", "L", "XL"].includes(s)) && (
                <details className="relative text-xs">
                  <summary className="cursor-pointer list-none text-ink-mute underline underline-offset-4">Size guide</summary>
                  <div className="absolute right-0 z-20 mt-2 w-64 border border-line bg-ivory p-4 text-ink-soft shadow-lg">
                    <table className="w-full text-left">
                      <thead><tr className="text-[0.6rem] uppercase tracking-widest"><th>Size</th><th>Bust</th><th>Waist</th></tr></thead>
                      <tbody className="tabular-nums">
                        {[["XS", 32, 26], ["S", 34, 28], ["M", 36, 30], ["L", 38, 32], ["XL", 40, 34]].map(([s, b, w]) => (
                          <tr key={s as string}><td className="py-0.5">{s}</td><td>{b}&quot;</td><td>{w}&quot;</td></tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              )}
            </legend>
            <div className="flex flex-wrap gap-2">
              {options(d).map((value) => {
                const st = optionState(d, value);
                const active = sel[d] === value;
                const hex = d === "color" ? variants.find((v) => v.color === value)?.colorHex : null;
                if (d === "color" && hex) {
                  return (
                    <button
                      key={value}
                      onClick={() => choose(d, value)}
                      disabled={!st.exists}
                      aria-pressed={active}
                      title={`${value}${st.inStock ? "" : " — sold out"}`}
                      className={cn(
                        "relative size-9 rounded-full border border-line ring-offset-[3px] ring-offset-ivory transition",
                        active ? "ring-1 ring-espresso" : "hover:ring-1 hover:ring-line-strong",
                        !st.inStock && "opacity-40",
                      )}
                      style={{ backgroundColor: hex }}
                    >
                      <span className="sr-only">{value}</span>
                      {!st.inStock && <span className="absolute left-1/2 top-1/2 h-px w-10 -translate-x-1/2 -translate-y-1/2 rotate-45 bg-espresso/60" />}
                    </button>
                  );
                }
                return (
                  <button
                    key={value}
                    onClick={() => choose(d, value)}
                    disabled={!st.exists}
                    aria-pressed={active}
                    className={cn(
                      "min-w-12 border px-4 py-2.5 text-sm transition",
                      active ? "border-espresso bg-espresso text-ivory" : "border-line-strong hover:border-espresso",
                      !st.inStock && !active && "text-ink-mute line-through decoration-ink-mute/60",
                      !st.exists && "cursor-not-allowed opacity-30",
                    )}
                  >
                    {value}
                  </button>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <p className={cn("mt-7 flex items-center gap-2 text-sm", stock === 0 ? "text-danger" : stock <= 3 ? "text-warning" : "text-success")} aria-live="polite">
        <span className="size-1.5 rounded-full bg-current" />
        {stock === 0 ? "Sold out in this option" : stock <= 3 ? `Only ${stock} left — order soon` : "In stock, ready to dispatch"}
      </p>

      <div className="mt-5 flex gap-3">
        <QtyStepper value={qty} max={Math.min(10, stock)} onChange={(n) => setQty(Math.max(1, n))} size="md" />
        <Button size="lg" className="h-12 flex-1" onClick={add} disabled={stock === 0}>
          {added ? (<><Check /> Added</>) : stock === 0 ? "Sold out" : "Add to bag"}
        </Button>
        <WishlistButton productId={props.productId} name={props.name} withLabel className="hidden sm:grid" />
      </div>
      <WishlistButton productId={props.productId} name={props.name} withLabel className="mt-3 w-full sm:hidden" />
      {match && <p className="mt-4 text-[0.68rem] uppercase tracking-[0.16em] text-ink-mute">SKU {match.sku}</p>}

      <ul className="mt-8 grid gap-3 border-y border-line py-6 text-sm text-ink-soft">
        <li className="flex items-center gap-3"><Truck className="size-4 text-mocha" strokeWidth={1.25} /> Free shipping above ₹2,999 · Dispatch in 24–48 hrs</li>
        <li className="flex items-center gap-3"><RotateCcw className="size-4 text-mocha" strokeWidth={1.25} /> Easy 7-day returns on unworn pieces</li>
        <li className="flex items-center gap-3"><ShieldCheck className="size-4 text-mocha" strokeWidth={1.25} /> Secure payments via Razorpay</li>
      </ul>
    </div>
  );
}
