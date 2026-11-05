"use client";

import * as React from "react";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { ShoppingBag, AlertCircle } from "lucide-react";
import { cart, useCart } from "@/features/cart/store";
import { useQuote } from "@/features/cart/use-quote";
import { Button, ArrowRight } from "@/components/ui/button";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { QtyStepper } from "./cart-drawer";
import { OrderSummary } from "./order-summary";
import { formatINR } from "@/lib/utils";
import { readSession, useHydrated } from "@/hooks/use-hydrated";

export function CartView() {
  const hydrated = useHydrated();
  if (!hydrated) {
    return (
      <div className="mt-12 grid gap-10 lg:grid-cols-12">
        <div className="space-y-6 lg:col-span-8">{[0, 1].map((i) => <Skeleton key={i} className="h-36 w-full" />)}</div>
        <Skeleton className="h-80 lg:col-span-4" />
      </div>
    );
  }
  return <CartViewInner />;
}

function CartViewInner() {
  const { items, subtotal } = useCart();
  const [coupon, setCoupon] = React.useState(() => readSession("ravantra.coupon"));
  const { quote, loading } = useQuote(items, coupon);
  const applyCoupon = (c: string) => {
    setCoupon(c);
    try {
      sessionStorage.setItem("ravantra.coupon", c);
    } catch {}
  };

  if (!items.length) {
    return (
      <EmptyState
        className="mt-6"
        icon={<ShoppingBag className="size-10" strokeWidth={1} />}
        title="Your bag is empty"
        description="Fashion, beauty and lifestyle — all in one bag, one checkout."
        action={<Button asChild><Link href="/products">Start shopping</Link></Button>}
      />
    );
  }

  const unavailable = quote?.lines.filter((l) => !l.available) ?? [];
  const lineFor = (variantId: string) => quote?.lines.find((l) => l.variantId === variantId);

  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-12">
      <div className="lg:col-span-8">
        {unavailable.length > 0 && (
          <div className="mb-6 flex items-start gap-3 border border-warning/30 bg-warning/5 p-4 text-sm text-warning">
            <AlertCircle className="mt-0.5 size-4 shrink-0" />
            Some items have limited stock. Please adjust the highlighted quantities to continue.
          </div>
        )}
        <ul className="divide-y divide-line border-y border-line">
          {items.map((i) => {
            const line = lineFor(i.variantId);
            const short = line && !line.available;
            return (
              <li key={i.variantId} className="grid grid-cols-[96px_1fr] gap-5 py-6 sm:grid-cols-[120px_1fr_auto]">
                <Link href={`/products/${i.slug}`} className="relative aspect-[3/4] overflow-hidden bg-champagne">
                  {i.image && <Image src={i.image} alt={i.name} fill sizes="120px" quality={60} className="object-cover" />}
                </Link>
                <div className="flex flex-col">
                  <p className="eyebrow text-[0.6rem] text-mocha">{i.division}</p>
                  <Link href={`/products/${i.slug}`} className="mt-1 font-serif text-xl leading-snug hover:underline">{i.name}</Link>
                  <p className="mt-1 text-sm text-ink-mute">{i.variantLabel}</p>
                  <p className="mt-1 text-sm">{formatINR(i.unitPrice)}{i.compareAt && <span className="ml-2 text-ink-mute line-through">{formatINR(i.compareAt)}</span>}</p>
                  {short && <p className="mt-2 text-xs text-warning">{line.stock === 0 ? "Sold out — please remove" : `Only ${line.stock} available`}</p>}
                  <div className="mt-auto flex items-center gap-5 pt-4">
                    <QtyStepper value={i.quantity} max={Math.min(10, i.maxQty)} onChange={(q) => cart.setQuantity(i.variantId, q)} />
                    <button onClick={() => cart.remove(i.variantId)} className="text-xs text-ink-mute underline-offset-4 hover:text-danger hover:underline">Remove</button>
                  </div>
                </div>
                <p className="col-start-2 font-serif text-xl sm:col-start-auto sm:text-right">{formatINR(i.unitPrice * i.quantity)}</p>
              </li>
            );
          })}
        </ul>
        <Link href="/products" className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em] text-ink-soft hover:text-espresso">← Continue shopping</Link>
      </div>
      <aside className="lg:col-span-4">
        <div className="lg:sticky lg:top-24">
          <OrderSummary quote={quote} fallbackSubtotal={subtotal} loading={loading} coupon={coupon} onCoupon={applyCoupon}>
            <Button size="lg" className="w-full" asChild disabled={unavailable.length > 0}>
              <Link href="/checkout" aria-disabled={unavailable.length > 0} className={unavailable.length > 0 ? "pointer-events-none opacity-50" : ""}>
                Secure checkout <ArrowRight />
              </Link>
            </Button>
          </OrderSummary>
        </div>
      </aside>
    </div>
  );
}
