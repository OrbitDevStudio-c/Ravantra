import type { Metadata } from "next";
import { CheckoutSteps } from "@/components/cart/checkout-steps";
import { CartView } from "@/components/cart/cart-view";

export const metadata: Metadata = { title: "Your bag", robots: { index: false } };

export default function CartPage() {
  return (
    <div className="container-lux pb-24 pt-10">
      <CheckoutSteps current={0} />
      <h1 className="display display-lg mt-8 text-ink">Your bag</h1>
      <CartView />
    </div>
  );
}
