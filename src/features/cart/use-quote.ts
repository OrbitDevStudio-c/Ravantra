"use client";

import * as React from "react";
import { quoteCart } from "@/features/orders/actions";
import type { Quote } from "@/features/orders/quote";
import { cart, type CartItem } from "./store";

/** Re-prices the bag on the server whenever it (or the coupon) changes. */
export function useQuote(items: CartItem[], coupon: string) {
  const key = items.map((i) => `${i.variantId}:${i.quantity}`).join("|") + `#${coupon}`;
  const [result, setResult] = React.useState<{ key: string; quote: Quote | null; error: string | null }>({ key: "", quote: null, error: null });

  React.useEffect(() => {
    if (!items.length) return;
    let alive = true;
    const t = setTimeout(async () => {
      const res = await quoteCart({ lines: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })), coupon });
      if (!alive) return;
      if (res.ok) {
        setResult({ key, quote: res.data, error: null });
        cart.reconcile(res.data.lines.map((l) => ({ variantId: l.variantId, unitPrice: l.unitPrice, stock: l.stock })));
      } else setResult((r) => ({ key, quote: r.quote, error: res.error }));
    }, 200);
    return () => {
      alive = false;
      clearTimeout(t);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const hasItems = items.length > 0;
  return {
    quote: hasItems ? result.quote : null,
    loading: hasItems && result.key !== key,
    error: hasItems ? result.error : null,
  };
}
