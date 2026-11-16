"use client";

import { useWishlistSync } from "@/features/wishlist/store";
import { CartDrawer } from "@/components/cart/cart-drawer";

export function StoreProviders() {
  useWishlistSync();
  return <CartDrawer />;
}
