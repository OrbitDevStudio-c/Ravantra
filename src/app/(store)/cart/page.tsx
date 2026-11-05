import type { Metadata } from "next";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-lux pb-24 pt-10">
      <p className="eyebrow text-mocha">Shopping bag</p>
      <h1 className="display mt-3 text-[clamp(2.6rem,5vw,4.5rem)]">Your bag</h1>
      <CartView />
    </div>
  );
}
