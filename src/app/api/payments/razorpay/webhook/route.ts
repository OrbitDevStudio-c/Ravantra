import { NextResponse, type NextRequest } from "next/server";
import { verifyWebhookSignature } from "@/lib/payments/razorpay";
import { createServiceSupabase } from "@/lib/supabase/server";

/**
 * Razorpay webhook (configure in Dashboard → Webhooks):
 *   URL:    https://<your-domain>/api/payments/razorpay/webhook
 *   Events: payment.captured, payment.failed
 * Acts as a server-to-server backup if the browser closes before verification.
 */
export async function POST(req: NextRequest) {
  const raw = await req.text();
  if (!verifyWebhookSignature(raw, req.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let event: { event?: string; payload?: { payment?: { entity?: { id: string; order_id: string; amount: number; method?: string; error_description?: string } } } };
  try {
    event = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }
  const payment = event.payload?.payment?.entity;
  if (!payment?.order_id) return NextResponse.json({ ok: true, ignored: true });

  const service = createServiceSupabase();
  const { data: pay } = await service.from("payments").select("order_id, amount").eq("provider_order_id", payment.order_id).maybeSingle();
  if (!pay) return NextResponse.json({ ok: true, ignored: "unknown order" });

  if (event.event === "payment.captured") {
    if (Math.round(Number(pay.amount) * 100) !== payment.amount) {
      console.error("[webhook] amount mismatch", payment.order_id);
      return NextResponse.json({ error: "amount mismatch" }, { status: 400 });
    }
    await service.rpc("payment_mark_successful", {
      p_order: pay.order_id,
      p_provider_payment_id: payment.id,
      p_method: payment.method ?? null,
      p_raw: { id: payment.id, source: "webhook" },
    });
  } else if (event.event === "payment.failed") {
    await service.rpc("payment_mark_failed", { p_order: pay.order_id, p_reason: payment.error_description ?? "Payment failed" });
  }
  return NextResponse.json({ ok: true });
}
