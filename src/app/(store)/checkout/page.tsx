import type { Metadata } from "next";
import { CheckoutForm } from "@/components/cart/checkout-form";
import { isPreviewMode } from "@/lib/env";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import type { Address } from "@/types";

export const metadata: Metadata = { title: "Checkout", robots: { index: false } };

export default async function CheckoutPage() {
  let addresses: Address[] = [];
  let profile = { name: "", phone: "", email: "" };

  if (!isPreviewMode) {
    const user = await requireUser("/checkout");
    const sb = await createServerSupabase();
    const [{ data: addr }, { data: prof }] = await Promise.all([
      sb.from("addresses").select("*").eq("user_id", user.id).order("is_default", { ascending: false }),
      sb.from("profiles").select("full_name, phone, email").eq("id", user.id).single(),
    ]);
    addresses = (addr ?? []).map((a) => ({
      id: a.id,
      label: a.label,
      fullName: a.full_name,
      phone: a.phone,
      line1: a.line1,
      line2: a.line2,
      city: a.city,
      state: a.state,
      postalCode: a.postal_code,
      isDefault: a.is_default,
    }));
    profile = { name: prof?.full_name ?? "", phone: prof?.phone ?? "", email: prof?.email ?? user.email ?? "" };
  }

  return (
    <div className="container-lux pb-24 pt-10">
      <p className="eyebrow text-mocha">Secure checkout</p>
      <h1 className="display mt-3 text-[clamp(2.4rem,4.5vw,4rem)]">Almost yours</h1>
      <CheckoutForm
        addresses={addresses}
        profile={profile}
        preview={isPreviewMode}
        paymentMode={isPreviewMode ? "preview" : isRazorpayConfigured() ? "razorpay" : "demo"}
      />
    </div>
  );
}
