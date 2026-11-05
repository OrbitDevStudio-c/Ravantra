"use server";

import { z } from "zod";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import { createServerSupabase, createServiceSupabase } from "@/lib/supabase/server";
import { checkoutSchema, fieldErrors } from "@/lib/validations";
import { createRazorpayOrder, fetchPayment, isRazorpayConfigured, toPaise, verifyPaymentSignature } from "@/lib/payments/razorpay";
import { orderConfirmationEmail, sendEmail } from "@/lib/email";
import { friendlyDbError } from "@/lib/utils";
import type { ActionResult } from "@/types";
import { quoteFromDemo, quoteFromRpc, type Quote } from "./quote";

const PREVIEW_ERROR = "Checkout is disabled in preview mode. Connect Supabase (see README) to place real test orders.";

/* ------------------------------------------------------------------ */
/* Quote (server-authoritative prices)                                  */
/* ------------------------------------------------------------------ */

export async function quoteCart(input: { lines: { variantId: string; quantity: number }[]; coupon?: string }): Promise<ActionResult<Quote>> {
  const lines = z.array(z.object({ variantId: z.uuid(), quantity: z.number().int().min(1).max(10) })).max(30).safeParse(input.lines);
  if (!lines.success) return { ok: false, error: "Your bag contains an invalid item." };
  const coupon = (input.coupon ?? "").trim().slice(0, 24);
  if (!lines.data.length) return { ok: true, data: quoteFromDemo([], null) };

  if (!isSupabaseConfigured) return { ok: true, data: quoteFromDemo(lines.data, coupon) };

  const sb = await createServerSupabase();
  const { data, error } = await sb.rpc("quote_cart", {
    p_items: lines.data.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
    p_coupon: coupon || null,
  });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return { ok: true, data: quoteFromRpc(data) };
}

/* ------------------------------------------------------------------ */
/* Place order → create payment                                         */
/* ------------------------------------------------------------------ */

export type PaymentStart =
  | { mode: "razorpay"; orderId: string; orderNumber: string; keyId: string; razorpayOrderId: string; amountPaise: number; prefill: { name: string; email: string; contact: string } }
  | { mode: "demo"; orderId: string; orderNumber: string; amount: number };

async function startPayment(orderId: string, orderNumber: string, total: number, prefill: { name: string; email: string; contact: string }): Promise<ActionResult<PaymentStart>> {
  const env = serverEnv();
  if (isRazorpayConfigured()) {
    const rp = await createRazorpayOrder({ amountPaise: toPaise(total), receipt: orderNumber, notes: { order_id: orderId, order_number: orderNumber } });
    const service = createServiceSupabase();
    const { error } = await service.rpc("payment_attach_provider_order", { p_order: orderId, p_provider: "razorpay", p_provider_order_id: rp.id });
    if (error) return { ok: false, error: friendlyDbError(error.message) };
    return { ok: true, data: { mode: "razorpay", orderId, orderNumber, keyId: env.razorpayKeyId, razorpayOrderId: rp.id, amountPaise: rp.amount, prefill } };
  }
  if (env.demoPayments) return { ok: true, data: { mode: "demo", orderId, orderNumber, amount: total } };
  return { ok: false, error: "Payments are not configured. Add Razorpay keys or enable DEMO_PAYMENTS." };
}

export async function placeOrder(input: z.input<typeof checkoutSchema>): Promise<ActionResult<PaymentStart>> {
  if (!isSupabaseConfigured) return { ok: false, error: PREVIEW_ERROR };
  const parsed = checkoutSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check your details.", fieldErrors: fieldErrors(parsed.error) };
  const { lines, address, coupon, notes, saveAddress } = parsed.data;

  const sb = await createServerSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return { ok: false, error: "Please sign in to continue." };

  const { data, error } = await sb.rpc("place_order", {
    p_items: lines.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
    p_address: {
      full_name: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
    },
    p_coupon: coupon || null,
    p_notes: notes || null,
  });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  const placed = data as { order_id: string; order_number: string; total: number };

  if (saveAddress) {
    const { count } = await sb.from("addresses").select("id", { count: "exact", head: true }).eq("user_id", auth.user.id);
    await sb.from("addresses").insert({
      user_id: auth.user.id,
      label: "Home",
      full_name: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2 || null,
      city: address.city,
      state: address.state,
      postal_code: address.postalCode,
      is_default: !count,
    });
  }

  try {
    return await startPayment(placed.order_id, placed.order_number, Number(placed.total), {
      name: address.fullName,
      email: auth.user.email ?? "",
      contact: address.phone.replace(/\s/g, ""),
    });
  } catch (e) {
    console.error("[payments] start failed", e);
    return { ok: false, error: "We couldn't start the payment. Your order is saved — retry from your account." };
  }
}

/** Retry payment for an unpaid order the current user owns. */
export async function retryPayment(orderId: string): Promise<ActionResult<PaymentStart>> {
  if (!isSupabaseConfigured) return { ok: false, error: PREVIEW_ERROR };
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "Invalid order." };
  const sb = await createServerSupabase();
  const { data: o } = await sb
    .from("orders")
    .select("id, order_number, total, status, payment_status, customer_name, customer_email, customer_phone, stock_released")
    .eq("id", orderId)
    .maybeSingle();
  if (!o) return { ok: false, error: "Order not found." };
  if (o.status !== "pending" || o.payment_status === "successful" || o.stock_released) return { ok: false, error: "This order can no longer be paid." };
  try {
    return await startPayment(o.id, o.order_number, Number(o.total), { name: o.customer_name, email: o.customer_email, contact: (o.customer_phone ?? "").replace(/\s/g, "") });
  } catch {
    return { ok: false, error: "We couldn't start the payment. Please try again." };
  }
}

/* ------------------------------------------------------------------ */
/* Verification — never trust the client                                */
/* ------------------------------------------------------------------ */

const verifySchema = z.object({
  orderId: z.uuid(),
  razorpay_order_id: z.string().min(5).max(64),
  razorpay_payment_id: z.string().min(5).max(64),
  razorpay_signature: z.string().length(64),
});

async function notifyOrderConfirmed(orderId: string) {
  try {
    const service = createServiceSupabase();
    const { data: o } = await service
      .from("orders")
      .select("order_number, customer_name, customer_email, total, order_items(product_name, quantity, unit_price)")
      .eq("id", orderId)
      .single();
    if (!o) return;
    await sendEmail({
      to: o.customer_email,
      subject: `Order ${o.order_number} confirmed — RAVANTRA`,
      html: orderConfirmationEmail({
        orderNumber: o.order_number,
        customerName: o.customer_name,
        total: Number(o.total),
        items: (o.order_items ?? []).map((i: { product_name: string; quantity: number; unit_price: number }) => ({ name: i.product_name, qty: i.quantity, price: Number(i.unit_price) })),
      }),
    });
  } catch (e) {
    console.error("[email] order confirmation", e);
  }
}

export async function verifyRazorpayPayment(input: z.input<typeof verifySchema>): Promise<ActionResult<{ orderId: string }>> {
  const parsed = verifySchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid payment response." };
  const { orderId, razorpay_order_id, razorpay_payment_id, razorpay_signature } = parsed.data;

  // 1. Signature (HMAC with our secret) proves the response came from Razorpay
  if (!verifyPaymentSignature(razorpay_order_id, razorpay_payment_id, razorpay_signature)) {
    return { ok: false, error: "Payment signature could not be verified." };
  }

  const service = createServiceSupabase();
  // 2. The Razorpay order must belong to this order
  const { data: pay } = await service.from("payments").select("order_id, provider_order_id, amount").eq("provider_order_id", razorpay_order_id).maybeSingle();
  if (!pay || pay.order_id !== orderId) return { ok: false, error: "Payment does not match this order." };

  // 3. Ask Razorpay directly for the payment status + amount
  const payment = await fetchPayment(razorpay_payment_id);
  if (payment.order_id !== razorpay_order_id || payment.amount !== toPaise(Number(pay.amount))) {
    return { ok: false, error: "Payment details do not match the order." };
  }
  if (payment.status !== "captured" && payment.status !== "authorized") {
    await service.rpc("payment_mark_failed", { p_order: orderId, p_reason: payment.error_description ?? `Payment ${payment.status}` });
    return { ok: false, error: "Payment was not completed." };
  }

  const { data: changed, error } = await service.rpc("payment_mark_successful", {
    p_order: orderId,
    p_provider_payment_id: razorpay_payment_id,
    p_method: payment.method,
    p_raw: { id: payment.id, status: payment.status, method: payment.method },
  });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  if (changed) await notifyOrderConfirmed(orderId);
  return { ok: true, data: { orderId } };
}

/** Simulated payment — only when Razorpay keys are absent and DEMO_PAYMENTS=true. */
export async function completeDemoPayment(orderId: string): Promise<ActionResult<{ orderId: string }>> {
  if (!isSupabaseConfigured) return { ok: false, error: PREVIEW_ERROR };
  if (isRazorpayConfigured() || !serverEnv().demoPayments) return { ok: false, error: "Demo payments are disabled." };
  if (!z.uuid().safeParse(orderId).success) return { ok: false, error: "Invalid order." };

  // ownership check through RLS (user client)
  const sb = await createServerSupabase();
  const { data: o } = await sb.from("orders").select("id, order_number, status, payment_status").eq("id", orderId).maybeSingle();
  if (!o) return { ok: false, error: "Order not found." };
  if (o.status !== "pending") return { ok: false, error: "This order can no longer be paid." };

  const service = createServiceSupabase();
  await service.rpc("payment_attach_provider_order", { p_order: orderId, p_provider: "demo", p_provider_order_id: `demo_${o.order_number}` });
  const { data: changed, error } = await service.rpc("payment_mark_successful", {
    p_order: orderId,
    p_provider_payment_id: `demo_pay_${o.order_number}_${Date.now()}`,
    p_method: "demo",
    p_raw: { simulated: true },
  });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  if (changed) await notifyOrderConfirmed(orderId);
  return { ok: true, data: { orderId } };
}

export async function reportPaymentFailure(orderId: string, reason: string): Promise<ActionResult> {
  if (!isSupabaseConfigured || !z.uuid().safeParse(orderId).success) return { ok: false, error: "Invalid order." };
  const sb = await createServerSupabase();
  const { data: o } = await sb.from("orders").select("id").eq("id", orderId).maybeSingle();
  if (!o) return { ok: false, error: "Order not found." };
  await createServiceSupabase().rpc("payment_mark_failed", { p_order: orderId, p_reason: reason.slice(0, 200) });
  return { ok: true };
}

export async function cancelMyOrder(orderId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured || !z.uuid().safeParse(orderId).success) return { ok: false, error: "Invalid order." };
  const sb = await createServerSupabase();
  const { error } = await sb.rpc("cancel_my_order", { p_order: orderId });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  return { ok: true };
}

