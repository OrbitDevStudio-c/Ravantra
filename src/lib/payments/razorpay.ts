import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import { serverEnv } from "@/lib/env";

/**
 * Minimal Razorpay REST client (no SDK → smaller server bundle).
 * Docs: https://razorpay.com/docs/api/
 */
const API = "https://api.razorpay.com/v1";

export function isRazorpayConfigured() {
  const env = serverEnv();
  return Boolean(env.razorpayKeyId && env.razorpayKeySecret);
}

function authHeader() {
  const { razorpayKeyId, razorpayKeySecret } = serverEnv();
  return "Basic " + Buffer.from(`${razorpayKeyId}:${razorpayKeySecret}`).toString("base64");
}

async function call<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { Authorization: authHeader(), "Content-Type": "application/json", ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = (body as { error?: { description?: string } })?.error?.description ?? `Razorpay error ${res.status}`;
    throw new Error(msg);
  }
  return body as T;
}

export interface RazorpayOrder {
  id: string;
  amount: number;
  currency: string;
  receipt: string;
  status: string;
}

export function createRazorpayOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
  return call<RazorpayOrder>("/orders", {
    method: "POST",
    body: JSON.stringify({ amount: input.amountPaise, currency: "INR", receipt: input.receipt.slice(0, 40), notes: input.notes ?? {} }),
  });
}

export interface RazorpayPayment {
  id: string;
  order_id: string;
  amount: number;
  currency: string;
  status: "created" | "authorized" | "captured" | "refunded" | "failed";
  method: string;
  error_description?: string | null;
}

export function fetchPayment(paymentId: string) {
  return call<RazorpayPayment>(`/payments/${encodeURIComponent(paymentId)}`);
}

export function refundPayment(paymentId: string, amountPaise?: number) {
  return call<{ id: string; amount: number; status: string }>(`/payments/${encodeURIComponent(paymentId)}/refund`, {
    method: "POST",
    body: JSON.stringify(amountPaise ? { amount: amountPaise, speed: "normal" } : { speed: "normal" }),
  });
}

function safeEqualHex(a: string, b: string) {
  const ba = Buffer.from(a, "hex");
  const bb = Buffer.from(b, "hex");
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Checkout signature: HMAC_SHA256(order_id|payment_id, key_secret) */
export function verifyPaymentSignature(orderId: string, paymentId: string, signature: string) {
  const { razorpayKeySecret } = serverEnv();
  if (!razorpayKeySecret || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", razorpayKeySecret).update(`${orderId}|${paymentId}`).digest("hex");
  return safeEqualHex(expected, signature);
}

/** Webhook signature: HMAC_SHA256(raw_body, webhook_secret) */
export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  const { razorpayWebhookSecret } = serverEnv();
  if (!razorpayWebhookSecret || !signature || !/^[a-f0-9]{64}$/i.test(signature)) return false;
  const expected = createHmac("sha256", razorpayWebhookSecret).update(rawBody).digest("hex");
  return safeEqualHex(expected, signature);
}

export const toPaise = (rupees: number) => Math.round(rupees * 100);
