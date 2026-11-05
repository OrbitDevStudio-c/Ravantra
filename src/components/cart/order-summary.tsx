"use client";

import * as React from "react";
import type { Quote } from "@/features/orders/quote";
import { cn, formatINR } from "@/lib/utils";

export function OrderSummary({
  quote,
  fallbackSubtotal,
  loading,
  coupon,
  onCoupon,
  children,
}: {
  quote: Quote | null;
  fallbackSubtotal: number;
  loading?: boolean;
  coupon: string;
  onCoupon: (c: string) => void;
  children?: React.ReactNode;
}) {
  const [code, setCode] = React.useState(coupon);
  const subtotal = quote?.subtotal ?? fallbackSubtotal;
  return (
    <div className="border border-line bg-white/50 p-6 md:p-8">
      <h2 className="font-serif text-2xl">Order summary</h2>
      <form
        className="mt-6 flex items-end gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          onCoupon(code.trim().toUpperCase());
        }}
      >
        <label className="flex-1">
          <span className="eyebrow text-[0.6rem] text-ink-mute">Offer code</span>
          <input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="e.g. WELCOME10" maxLength={24} className="field py-2 uppercase tracking-wider" />
        </label>
        {coupon && quote?.couponCode ? (
          <button type="button" onClick={() => { setCode(""); onCoupon(""); }} className="pb-2 text-[0.68rem] uppercase tracking-[0.16em] text-ink-mute hover:text-danger">Remove</button>
        ) : (
          <button className="pb-2 text-[0.68rem] uppercase tracking-[0.16em] hover:underline">Apply</button>
        )}
      </form>
      {quote?.couponError && coupon && <p className="mt-2 text-xs text-danger">{quote.couponError}</p>}
      {quote?.couponCode && <p className="mt-2 text-xs text-success">“{quote.couponCode}” applied</p>}

      <dl className={cn("mt-6 space-y-3 border-t border-line pt-6 text-sm transition-opacity", loading && "opacity-50")}>
        <Row label="Subtotal" value={formatINR(subtotal)} />
        {quote && quote.discount > 0 && <Row label="Discount" value={`− ${formatINR(quote.discount)}`} accent />}
        <Row label="Shipping" value={quote ? (quote.shipping === 0 ? "Complimentary" : formatINR(quote.shipping)) : "Calculated next"} />
        <div className="flex items-baseline justify-between border-t border-line pt-4">
          <dt className="eyebrow text-espresso">Total</dt>
          <dd className="font-serif text-3xl">{formatINR(quote?.total ?? subtotal)}</dd>
        </div>
      </dl>
      <p className="mt-2 text-[0.7rem] text-ink-mute">Prices include GST. Final amount is confirmed securely on our server.</p>
      {children && <div className="mt-6">{children}</div>}
      <p className="mt-5 text-center text-[0.68rem] text-ink-mute">Try codes WELCOME10 · FESTIVE25 · GLOW500 (demo)</p>
    </div>
  );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-baseline justify-between">
      <dt className="text-ink-soft">{label}</dt>
      <dd className={accent ? "text-success" : ""}>{value}</dd>
    </div>
  );
}
