"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Label, Textarea } from "@/components/ui/primitives";
import { Modal, useAdminAction } from "@/components/admin/client";
import { refundOrder, updateOrderStatus } from "@/features/admin/order-actions";
import { formatINR } from "@/lib/utils";

const LABELS: Record<string, string> = {
  confirmed: "Confirm order",
  processing: "Start processing",
  shipped: "Mark shipped",
  delivered: "Mark delivered",
  cancelled: "Cancel order",
};

export function OrderActions({
  orderId,
  next,
  paid,
  refundable,
  total,
  provider,
}: {
  orderId: string;
  next: string[];
  paid: boolean;
  refundable: boolean;
  total: number;
  provider: string | null;
}) {
  const { run, pending } = useAdminAction();
  const [refundOpen, setRefundOpen] = React.useState(false);
  const [note, setNote] = React.useState("");

  // paid orders can't be "cancelled" directly — they go through refund
  const forward = next.filter((s) => s !== "cancelled" && !(s === "confirmed" && !paid));
  const canCancel = next.includes("cancelled") && !paid;

  return (
    <div className="flex flex-wrap gap-2">
      {forward.map((s) => (
        <Button key={s} size="sm" loading={pending} onClick={() => run(() => updateOrderStatus(orderId, s), { success: `Order ${s}` })}>
          {LABELS[s] ?? s}
        </Button>
      ))}
      {canCancel && (
        <Button
          size="sm"
          variant="outline"
          loading={pending}
          onClick={() => {
            if (window.confirm("Cancel this unpaid order? Reserved stock will be returned.")) run(() => updateOrderStatus(orderId, "cancelled", "Cancelled by staff"), { success: "Order cancelled" });
          }}
        >
          Cancel order
        </Button>
      )}
      {refundable && (
        <Button size="sm" variant="danger" onClick={() => setRefundOpen(true)}>
          Cancel &amp; refund
        </Button>
      )}
      <Modal open={refundOpen} onOpenChange={setRefundOpen} title="Cancel & refund">
        <p className="text-sm text-ink-soft">
          Refund <strong className="text-espresso">{formatINR(total)}</strong>{" "}
          {provider === "razorpay" ? "to the customer's original payment method via Razorpay." : "(simulated demo payment — no gateway call)."} Stock is returned automatically if the order hasn&apos;t shipped.
        </p>
        <div className="mt-5">
          <Label htmlFor="refund-note">Reason (internal)</Label>
          <Textarea boxed id="refund-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="e.g. Customer requested cancellation" />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setRefundOpen(false)}>Keep order</Button>
          <Button
            variant="danger"
            size="sm"
            loading={pending}
            onClick={() => run(() => refundOrder(orderId, note), { success: "Refund recorded", onSuccess: () => setRefundOpen(false) })}
          >
            Confirm refund
          </Button>
        </div>
      </Modal>
    </div>
  );
}
