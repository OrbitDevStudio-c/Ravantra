"use client";

import * as React from "react";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Lock, MapPin } from "lucide-react";
import { useCart, cart } from "@/features/cart/store";
import { useQuote } from "@/features/cart/use-quote";
import { completeDemoPayment, placeOrder, reportPaymentFailure, verifyRazorpayPayment, type PaymentStart } from "@/features/orders/actions";
import { addressSchema, INDIAN_STATES, type AddressInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { EmptyState, Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { OrderSummary } from "./order-summary";
import { cn, formatINR } from "@/lib/utils";
import type { Address } from "@/types";
import { readSession, useHydrated } from "@/hooks/use-hydrated";

declare global {
  interface Window {
    Razorpay?: new (opts: Record<string, unknown>) => { open: () => void; on: (e: string, cb: (r: { error?: { description?: string } }) => void) => void };
  }
}

function loadRazorpay(): Promise<boolean> {
  if (typeof window === "undefined") return Promise.resolve(false);
  if (window.Razorpay) return Promise.resolve(true);
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(true);
    s.onerror = () => resolve(false);
    document.body.appendChild(s);
  });
}

type CheckoutProps = {
  addresses: Address[];
  profile: { name: string; phone: string; email: string };
  preview: boolean;
  paymentMode: "razorpay" | "demo" | "preview";
};

export function CheckoutForm(props: CheckoutProps) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="mt-12 h-96 skeleton" />;
  return <CheckoutFormInner {...props} />;
}

function CheckoutFormInner({
  addresses,
  profile,
  preview,
  paymentMode,
}: {
  addresses: Address[];
  profile: { name: string; phone: string; email: string };
  preview: boolean;
  paymentMode: "razorpay" | "demo" | "preview";
}) {
  const router = useRouter();
  const { items, subtotal } = useCart();
  const [coupon, setCoupon] = React.useState(() => readSession("ravantra.coupon"));
  const [selected, setSelected] = React.useState<string | "new">(addresses[0]?.id ?? "new");
  const [notes, setNotes] = React.useState("");
  const [saveAddress, setSaveAddress] = React.useState(addresses.length === 0);
  const [submitting, setSubmitting] = React.useState(false);
  const [pendingOrder, setPendingOrder] = React.useState<string | null>(null);
  const { quote, loading } = useQuote(items, coupon);

  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: { fullName: profile.name, phone: profile.phone, line1: "", line2: "", city: "", state: "", postalCode: "" },
  });

  const finish = (orderId: string) => {
    cart.clear();
    try {
      sessionStorage.removeItem("ravantra.coupon");
    } catch {}
    router.push(`/checkout/success?order=${orderId}`);
  };

  const pay = async (start: PaymentStart) => {
    if (start.mode === "demo") {
      const res = await completeDemoPayment(start.orderId);
      if (res.ok) finish(start.orderId);
      else {
        toast.error(res.error);
        setPendingOrder(start.orderId);
      }
      return;
    }
    const ok = await loadRazorpay();
    if (!ok || !window.Razorpay) {
      toast.error("Couldn't load the payment window. Check your connection and retry from your orders.");
      setPendingOrder(start.orderId);
      return;
    }
    const rz = new window.Razorpay({
      key: start.keyId,
      order_id: start.razorpayOrderId,
      amount: start.amountPaise,
      currency: "INR",
      name: "RAVANTRA",
      description: `Order ${start.orderNumber}`,
      prefill: start.prefill,
      theme: { color: "#211B20" },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        setSubmitting(true);
        const res = await verifyRazorpayPayment({ orderId: start.orderId, ...r });
        setSubmitting(false);
        if (res.ok) finish(start.orderId);
        else {
          toast.error(res.error);
          setPendingOrder(start.orderId);
        }
      },
      modal: {
        ondismiss: () => {
          setPendingOrder(start.orderId);
          toast("Payment window closed. Your order is saved — you can retry anytime.");
        },
      },
    });
    rz.on("payment.failed", (resp) => {
      void reportPaymentFailure(start.orderId, resp.error?.description ?? "Payment failed");
    });
    rz.open();
  };

  const submit = async (address: AddressInput | null) => {
    if (preview) {
      toast.error("Checkout is disabled in preview mode — connect Supabase to place test orders.");
      return;
    }
    const chosen = address ?? addresses.find((a) => a.id === selected);
    if (!chosen) return;
    setSubmitting(true);
    const res = await placeOrder({
      lines: items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
      address: {
        fullName: chosen.fullName,
        phone: chosen.phone,
        line1: chosen.line1,
        line2: chosen.line2 ?? "",
        city: chosen.city,
        state: chosen.state,
        postalCode: chosen.postalCode,
      },
      coupon: quote?.couponCode ?? "",
      notes,
      saveAddress: address ? saveAddress : false,
    });
    setSubmitting(false);
    if (!res.ok) {
      toast.error(res.error);
      return;
    }
    await pay(res.data);
  };

  const onPlace = () => {
    if (selected === "new") void form.handleSubmit((v) => submit(v))();
    else void submit(null);
  };

  if (!items.length && !pendingOrder) {
    return (
      <EmptyState title="Your bag is empty" description="Add something you love, then come back to check out." action={<Button asChild><Link href="/products">Shop now</Link></Button>} />
    );
  }

  const blocked = (quote?.lines.some((l) => !l.available) ?? false) || submitting;
  const errors = form.formState.errors;

  return (
    <div className="mt-12 grid gap-12 lg:grid-cols-12">
      <div className="space-y-12 lg:col-span-7">
        {preview && (
          <div className="border border-gold/40 bg-gold/10 p-4 text-sm">
            <strong className="font-medium">Preview mode:</strong> you can explore checkout, but placing orders needs Supabase. See the README to connect in ~5 minutes.
          </div>
        )}
        {pendingOrder && (
          <div className="border border-line-strong bg-white/60 p-5 text-sm">
            Your order is saved but unpaid. <Link href={`/account/orders/${pendingOrder}`} className="underline underline-offset-4">Retry payment from your order page</Link>.
          </div>
        )}

        <section>
          <StepTitle n={1} title="Delivery address" />
          {addresses.length > 0 && (
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {addresses.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  onClick={() => setSelected(a.id!)}
                  className={cn("border p-5 text-left text-sm transition", selected === a.id ? "border-espresso bg-white" : "border-line hover:border-line-strong")}
                  aria-pressed={selected === a.id}
                >
                  <span className="flex items-center gap-2 font-medium"><MapPin className="size-3.5" /> {a.label}{a.isDefault && <span className="text-[0.6rem] uppercase tracking-widest text-mocha">· Default</span>}</span>
                  <span className="mt-2 block text-ink-soft">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.postalCode}<br />{a.phone}</span>
                </button>
              ))}
              <button
                type="button"
                onClick={() => setSelected("new")}
                className={cn("grid place-items-center border border-dashed p-5 text-sm transition", selected === "new" ? "border-espresso" : "border-line-strong hover:border-espresso")}
              >
                + Add a new address
              </button>
            </div>
          )}

          {selected === "new" && (
            <form className="mt-8 grid gap-6 sm:grid-cols-2" onSubmit={(e) => e.preventDefault()} noValidate>
              <Field label="Full name" error={errors.fullName?.message} htmlFor="fullName"><Input id="fullName" autoComplete="name" {...form.register("fullName")} /></Field>
              <Field label="Phone" error={errors.phone?.message} htmlFor="phone"><Input id="phone" autoComplete="tel" inputMode="tel" placeholder="+91 98xxx xxxxx" {...form.register("phone")} /></Field>
              <Field label="Address line 1" error={errors.line1?.message} className="sm:col-span-2" htmlFor="line1"><Input id="line1" autoComplete="address-line1" {...form.register("line1")} /></Field>
              <Field label="Address line 2 (optional)" className="sm:col-span-2" htmlFor="line2"><Input id="line2" autoComplete="address-line2" {...form.register("line2")} /></Field>
              <Field label="City" error={errors.city?.message} htmlFor="city"><Input id="city" autoComplete="address-level2" {...form.register("city")} /></Field>
              <Field label="State" error={errors.state?.message} htmlFor="state">
                <Select id="state" defaultValue="" {...form.register("state")}>
                  <option value="" disabled>Select state</option>
                  {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </Field>
              <Field label="PIN code" error={errors.postalCode?.message} htmlFor="postalCode"><Input id="postalCode" inputMode="numeric" maxLength={6} autoComplete="postal-code" {...form.register("postalCode")} /></Field>
              <label className="flex items-center gap-3 self-end pb-2 text-sm text-ink-soft">
                <input type="checkbox" checked={saveAddress} onChange={(e) => setSaveAddress(e.target.checked)} className="accent-espresso" /> Save to my address book
              </label>
            </form>
          )}
        </section>

        <section>
          <StepTitle n={2} title="Order notes" optional />
          <Textarea className="mt-6" value={notes} onChange={(e) => setNotes(e.target.value.slice(0, 500))} placeholder="Gift message or delivery instructions" />
        </section>

        <section>
          <StepTitle n={3} title="Payment" />
          <div className="mt-6 flex items-start gap-4 border border-line bg-white/50 p-5 text-sm">
            <Lock className="mt-0.5 size-4 shrink-0 text-mocha" />
            <div>
              {paymentMode === "razorpay" ? (
                <p>Pay securely with UPI, cards, netbanking or wallets via <strong className="font-medium">Razorpay</strong>. Your payment is verified on our server before your order is confirmed.</p>
              ) : paymentMode === "demo" ? (
                <p><strong className="font-medium">Demo payment mode.</strong> Razorpay keys aren&apos;t configured, so payment is simulated and clearly marked as “demo” on the order. Add keys to accept real (test-mode) payments.</p>
              ) : (
                <p>Payments are disabled in preview mode.</p>
              )}
            </div>
          </div>
        </section>
      </div>

      <aside className="lg:col-span-5">
        <div className="lg:sticky lg:top-24">
          <ul className="mb-6 max-h-72 divide-y divide-line overflow-y-auto border border-line bg-white/50 px-5">
            {items.map((i) => (
              <li key={i.variantId} className="flex gap-4 py-4">
                <div className="relative aspect-[3/4] w-14 shrink-0 bg-champagne">
                  {i.image && <Image src={i.image} alt="" fill sizes="56px" quality={50} className="object-cover" />}
                  <span className="absolute -right-2 -top-2 grid size-5 place-items-center rounded-full bg-espresso text-[0.6rem] text-ivory">{i.quantity}</span>
                </div>
                <div className="min-w-0 flex-1 text-sm">
                  <p className="line-clamp-1">{i.name}</p>
                  <p className="text-xs text-ink-mute">{i.variantLabel}</p>
                </div>
                <p className="text-sm">{formatINR(i.unitPrice * i.quantity)}</p>
              </li>
            ))}
          </ul>
          <OrderSummary quote={quote} fallbackSubtotal={subtotal} loading={loading} coupon={coupon} onCoupon={(c) => { setCoupon(c); try { sessionStorage.setItem("ravantra.coupon", c); } catch {} }}>
            <Button size="lg" className="w-full" onClick={onPlace} loading={submitting} disabled={blocked || loading || preview}>
              <Lock className="!size-3.5" /> {paymentMode === "demo" ? "Place order (demo payment)" : `Pay ${formatINR(quote?.total ?? subtotal)}`}
            </Button>
          </OrderSummary>
        </div>
      </aside>
    </div>
  );
}

function StepTitle({ n, title, optional }: { n: number; title: string; optional?: boolean }) {
  return (
    <div className="flex items-baseline gap-4 border-b border-line pb-4">
      <span className="font-serif text-lg italic text-gold-deep">0{n}</span>
      <h2 className="font-serif text-3xl">{title}</h2>
      {optional && <span className="text-xs text-ink-mute">Optional</span>}
    </div>
  );
}
