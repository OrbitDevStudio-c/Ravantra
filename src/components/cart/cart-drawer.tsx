"use client";

import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { Minus, Plus, ShoppingBag } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button, ArrowRight } from "@/components/ui/button";
import { cart, cartDrawer, useCart, useCartDrawer } from "@/features/cart/store";
import { SHIPPING_RULES } from "@/config/site";
import { formatINR } from "@/lib/utils";

export function CartDrawer() {
  const open = useCartDrawer();
  const { items, count, subtotal } = useCart();
  const remaining = Math.max(0, SHIPPING_RULES.freeAbove - subtotal);
  const progress = Math.min(100, (subtotal / SHIPPING_RULES.freeAbove) * 100);

  return (
    <Sheet open={open} onOpenChange={cartDrawer.set}>
      <SheetContent title="Shopping bag" side="right">
        <div className="flex items-baseline gap-3 border-b border-line px-6 pb-5 pt-6">
          <h2 className="font-serif text-3xl">Your bag</h2>
          <span className="text-xs text-ink-mute">{count} {count === 1 ? "piece" : "pieces"}</span>
        </div>

        {items.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center px-8 text-center">
            <ShoppingBag className="size-8 text-gold" strokeWidth={1} />
            <p className="mt-5 font-serif text-2xl">Your bag is waiting</p>
            <p className="mt-2 text-sm text-ink-soft">Start with something you&apos;ll love for years.</p>
            <Button className="mt-8" onClick={() => cartDrawer.set(false)} asChild>
              <Link href="/products">Discover the edit</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="border-b border-line px-6 py-4">
              <p className="text-xs text-ink-soft">
                {remaining > 0 ? (
                  <>You&apos;re <strong className="font-medium text-espresso">{formatINR(remaining)}</strong> away from complimentary shipping</>
                ) : (
                  <>Complimentary shipping unlocked ✦</>
                )}
              </p>
              <div className="mt-2 h-px w-full bg-line">
                <div className="h-px bg-gold transition-[width] duration-700 ease-[var(--ease-lux)]" style={{ width: `${progress}%` }} />
              </div>
            </div>
            <ul className="flex-1 divide-y divide-line overflow-y-auto px-6">
              {items.map((i) => (
                <li key={i.variantId} className="flex gap-4 py-5">
                  <Link href={`/products/${i.slug}`} onClick={() => cartDrawer.set(false)} className="relative aspect-[3/4] w-20 shrink-0 overflow-hidden bg-champagne">
                    {i.image && <Image src={i.image} alt={i.name} fill sizes="80px" className="object-cover" quality={60} />}
                  </Link>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <p className="eyebrow text-[0.58rem] text-mocha">{i.division}</p>
                    <Link href={`/products/${i.slug}`} onClick={() => cartDrawer.set(false)} className="mt-1 line-clamp-2 text-sm leading-snug">
                      {i.name}
                    </Link>
                    <p className="mt-0.5 text-xs text-ink-mute">{i.variantLabel}</p>
                    <div className="mt-auto flex items-center justify-between pt-3">
                      <QtyStepper value={i.quantity} max={Math.min(10, i.maxQty)} onChange={(q) => cart.setQuantity(i.variantId, q)} />
                      <div className="text-right">
                        <p className="text-sm">{formatINR(i.unitPrice * i.quantity)}</p>
                        <button onClick={() => cart.remove(i.variantId)} className="text-[0.7rem] text-ink-mute underline-offset-2 hover:text-danger hover:underline">
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
            <div className="border-t border-line bg-ivory-2/60 px-6 py-5">
              <div className="flex items-baseline justify-between">
                <span className="eyebrow text-ink-soft">Subtotal</span>
                <span className="font-serif text-2xl">{formatINR(subtotal)}</span>
              </div>
              <p className="mt-1 text-xs text-ink-mute">Shipping and offers are calculated securely at checkout.</p>
              <div className="mt-5 grid grid-cols-2 gap-3">
                <Button variant="outline" asChild onClick={() => cartDrawer.set(false)}>
                  <Link href="/cart">View bag</Link>
                </Button>
                <Button asChild onClick={() => cartDrawer.set(false)}>
                  <Link href="/checkout">Checkout <ArrowRight /></Link>
                </Button>
              </div>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

export function QtyStepper({ value, max, onChange, size = "sm" }: { value: number; max: number; onChange: (n: number) => void; size?: "sm" | "md" }) {
  const h = size === "md" ? "h-12" : "h-8";
  return (
    <div className={`inline-flex items-center border border-line-strong ${h}`}>
      <button type="button" className="grid h-full w-8 place-items-center disabled:opacity-30" onClick={() => onChange(value - 1)} aria-label="Decrease quantity">
        <Minus className="size-3" />
      </button>
      <span className="w-7 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" className="grid h-full w-8 place-items-center disabled:opacity-30" onClick={() => onChange(value + 1)} disabled={value >= max} aria-label="Increase quantity">
        <Plus className="size-3" />
      </button>
    </div>
  );
}
