import type { Product, ProductVariant } from "@/types";

/** Display pricing — mirrors the SQL used by quote_cart()/place_order(). */
export function variantPricing(product: Product, variant?: ProductVariant | null) {
  if (variant && variant.price != null) {
    const sale = variant.salePrice;
    return { price: sale ?? variant.price, compareAt: sale != null ? variant.price : null };
  }
  const sale = variant?.salePrice ?? product.salePrice;
  return { price: sale ?? product.price, compareAt: sale != null ? product.price : null };
}

export function productFromPrice(product: Product) {
  const active = product.variants.filter((v) => v.isActive);
  if (!active.length) return variantPricing(product);
  return active
    .map((v) => variantPricing(product, v))
    .reduce((min, p) => (p.price < min.price ? p : min));
}

export function productStock(product: Product) {
  return product.variants.filter((v) => v.isActive).reduce((a, v) => a + v.stock, 0);
}

export function variantLabel(v: Pick<ProductVariant, "color" | "size" | "volume" | "name">) {
  return [v.color, v.size, v.volume].filter(Boolean).join(" · ") || v.name;
}

export const SIZE_ORDER = ["XS", "S", "M", "L", "XL", "XXL"];
