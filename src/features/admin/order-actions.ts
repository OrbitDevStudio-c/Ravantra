"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createServiceSupabase } from "@/lib/supabase/server";
import { isRazorpayConfigured, refundPayment, toPaise } from "@/lib/payments/razorpay";
import { guarded, must, UserError } from "./shared";

const statusSchema = z.enum(["confirmed", "processing", "shipped", "delivered", "cancelled"]);

export async function updateOrderStatus(orderId: string, status: string, note?: string) {
  return guarded("orders.manage", async ({ sb }) => {
    const id = z.uuid().parse(orderId);
    const s = statusSchema.parse(status);
    must(await sb.rpc("admin_update_order_status", { p_order: id, p_status: s, p_note: note?.slice(0, 280) || null }));
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/admin/orders");
  });
}

/**
 * Cancel & refund a paid order:
 *  1. DB confirms the caller may manage every division in the order
 *  2. gateway refund (Razorpay) — skipped for clearly-labelled demo payments
 *  3. service-role RPC records the refund, restocks if not yet dispatched
 */
export async function refundOrder(orderId: string, note?: string) {
  return guarded("orders.manage", async ({ sb, access }) => {
    const id = z.uuid().parse(orderId);
    const allowed = must(await sb.rpc("can_manage_order", { p_order: id }));
    if (!allowed) throw new UserError("You can only refund orders that belong entirely to your divisions.");

    const order = must(
      await sb.from("orders").select("id, order_number, total, payment_status, status, payments(provider, provider_payment_id, status, amount)").eq("id", id).single(),
    ) as { order_number: string; total: number; payment_status: string; status: string; payments: { provider: string; provider_payment_id: string | null; status: string; amount: number }[] };
    if (order.payment_status !== "successful") throw new UserError("Only paid orders can be refunded.");
    const pay = order.payments.find((p) => p.status === "successful");
    if (!pay) throw new UserError("No captured payment found for this order.");
    const amount = Number(order.total);

    if (pay.provider === "razorpay") {
      if (!isRazorpayConfigured()) throw new UserError("Razorpay keys are not configured on the server — cannot issue the refund.");
      if (!pay.provider_payment_id) throw new UserError("Missing Razorpay payment id.");
      await refundPayment(pay.provider_payment_id, toPaise(amount));
    }

    const service = createServiceSupabase();
    must(
      await service.rpc("payment_mark_refunded", {
        p_order: id,
        p_amount: amount,
        p_actor: access.userId,
        p_note: note?.slice(0, 280) || (pay.provider === "demo" ? "Refund recorded (demo payment)" : "Refund issued via Razorpay"),
      }),
    );
    revalidatePath(`/admin/orders/${id}`);
    revalidatePath("/admin/orders");
  });
}
