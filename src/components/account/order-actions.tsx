"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelMyOrder, completeDemoPayment, retryPayment, verifyRazorpayPayment } from "@/features/orders/actions";
import { Button } from "@/components/ui/button";

export function OrderActions({ orderId, canPay, canCancel }: { orderId: string; canPay: boolean; canCancel: boolean; razorpay: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);

  const pay = async () => {
    setBusy("pay");
    const res = await retryPayment(orderId);
    if (!res.ok) {
      setBusy(null);
      toast.error(res.error);
      return;
    }
    const start = res.data;
    if (start.mode === "demo") {
      const r = await completeDemoPayment(orderId);
      setBusy(null);
      if (r.ok) {
        toast.success("Payment received (demo).");
        router.refresh();
      } else toast.error(r.error);
      return;
    }
    if (!window.Razorpay) {
      await new Promise<void>((resolve) => {
        const s = document.createElement("script");
        s.src = "https://checkout.razorpay.com/v1/checkout.js";
        s.onload = () => resolve();
        s.onerror = () => resolve();
        document.body.appendChild(s);
      });
    }
    setBusy(null);
    if (!window.Razorpay) return toast.error("Couldn't load the payment window.");
    new window.Razorpay({
      key: start.keyId,
      order_id: start.razorpayOrderId,
      amount: start.amountPaise,
      currency: "INR",
      name: "RAVANTRA",
      description: `Order ${start.orderNumber}`,
      prefill: start.prefill,
      theme: { color: "#211B20" },
      handler: async (r: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
        const v = await verifyRazorpayPayment({ orderId, ...r });
        if (v.ok) {
          toast.success("Payment received — thank you!");
          router.refresh();
        } else toast.error(v.error);
      },
    }).open();
  };

  const cancel = async () => {
    if (!confirm("Cancel this order? Reserved items will be released.")) return;
    setBusy("cancel");
    const res = await cancelMyOrder(orderId);
    setBusy(null);
    if (res.ok) {
      toast.success("Order cancelled.");
      router.refresh();
    } else toast.error(res.error);
  };

  return (
    <div className="flex flex-wrap items-center gap-3">
      {canPay && <Button onClick={pay} loading={busy === "pay"}>Complete payment</Button>}
      {canCancel && <Button variant="ghost" onClick={cancel} loading={busy === "cancel"} className="text-danger">Cancel order</Button>}
      <p className="text-xs text-ink-mute">Unpaid orders are released automatically after 60 minutes.</p>
    </div>
  );
}
