import "server-only";
import * as demo from "@/config/demo-data";
import { SHIPPING_RULES } from "@/config/site";

export interface Quote {
  lines: { variantId: string; productId: string; divisionId: string; quantity: number; unitPrice: number; lineTotal: number; stock: number; available: boolean }[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode: string | null;
  couponError: string | null;
}

/** Preview-mode quote — identical rules to public.quote_cart() */
export function quoteFromDemo(lines: { variantId: string; quantity: number }[], coupon?: string | null): Quote {
  const out: Quote["lines"] = [];
  for (const l of lines) {
    const product = demo.products.find((p) => p.variants.some((v) => v.id === l.variantId));
    const variant = product?.variants.find((v) => v.id === l.variantId);
    if (!product || !variant) continue;
    const unit = demo.unitPriceOf(product, variant);
    const qty = Math.max(1, Math.min(10, l.quantity));
    out.push({
      variantId: variant.id,
      productId: product.id,
      divisionId: product.divisionId,
      quantity: qty,
      unitPrice: unit,
      lineTotal: unit * qty,
      stock: variant.stock,
      available: variant.stock >= qty,
    });
  }
  const subtotal = out.filter((l) => l.available).reduce((a, l) => a + l.lineTotal, 0);
  let discount = 0;
  let couponError: string | null = null;
  let couponCode: string | null = null;
  if (coupon?.trim()) {
    const c = demo.coupons.find((x) => x.code === coupon.trim().toUpperCase() && x.isActive);
    if (!c) couponError = "This code is invalid or has expired.";
    else {
      const eligible = out.filter((l) => l.available && (!c.divisionId || l.divisionId === c.divisionId)).reduce((a, l) => a + l.lineTotal, 0);
      if (subtotal < c.minSubtotal) couponError = `Add ₹${(c.minSubtotal - subtotal).toLocaleString("en-IN")} more to use this code.`;
      else if (eligible <= 0) couponError = "This code does not apply to the items in your bag.";
      else {
        discount = c.discountType === "percent" ? Math.round((eligible * c.discountValue) / 100) : Math.min(c.discountValue, eligible);
        if (c.maxDiscount != null) discount = Math.min(discount, c.maxDiscount);
        couponCode = c.code;
      }
    }
  }
  const shipping = subtotal === 0 ? 0 : subtotal - discount >= SHIPPING_RULES.freeAbove ? 0 : SHIPPING_RULES.flat;
  return { lines: out, subtotal, discount, shipping, total: subtotal - discount + shipping, couponCode, couponError };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export function quoteFromRpc(data: any): Quote {
  return {
    lines: (data?.lines ?? []).map((l: any) => ({
      variantId: l.variant_id,
      productId: l.product_id,
      divisionId: l.division_id,
      quantity: Number(l.quantity),
      unitPrice: Number(l.unit_price),
      lineTotal: Number(l.line_total),
      stock: Number(l.stock),
      available: Boolean(l.available),
    })),
    subtotal: Number(data?.subtotal ?? 0),
    discount: Number(data?.discount ?? 0),
    shipping: Number(data?.shipping ?? 0),
    total: Number(data?.total ?? 0),
    couponCode: data?.coupon_code ?? null,
    couponError: data?.coupon_error ?? null,
  };
}
