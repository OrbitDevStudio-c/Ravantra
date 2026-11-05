import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle2, Clock } from "lucide-react";
import { requireUser } from "@/lib/auth/session";
import { createServerSupabase } from "@/lib/supabase/server";
import { isPreviewMode } from "@/lib/env";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Order confirmed", robots: { index: false } };

export default async function SuccessPage({ searchParams }: PageProps<"/checkout/success">) {
  if (isPreviewMode) notFound();
  const sp = await searchParams;
  const id = typeof sp.order === "string" ? sp.order : "";
  await requireUser("/account/orders");
  const sb = await createServerSupabase();
  const { data: o } = await sb
    .from("orders")
    .select("id, order_number, status, payment_status, total, created_at, customer_name, shipping_address, order_items(id, product_name, variant_name, quantity, line_total)")
    .eq("id", id)
    .maybeSingle();
  if (!o) notFound();

  const paid = o.payment_status === "successful";
  return (
    <div className="container-lux max-w-3xl py-20 text-center">
      {paid ? <CheckCircle2 className="mx-auto size-12 text-success" strokeWidth={1} /> : <Clock className="mx-auto size-12 text-warning" strokeWidth={1} />}
      <p className="eyebrow mt-8 text-mocha">Order {o.order_number}</p>
      <h1 className="display mt-4 text-[clamp(2.6rem,5vw,4.4rem)]">{paid ? `Thank you, ${o.customer_name.split(" ")[0]}.` : "Payment pending"}</h1>
      <p className="mx-auto mt-5 max-w-md text-ink-soft">
        {paid ? "Your order is confirmed. A confirmation email is on its way, and we'll notify you as soon as it ships." : "We haven't received your payment yet. You can retry from your order page."}
      </p>
      <div className="mt-12 border border-line bg-white/50 p-8 text-left">
        <div className="flex justify-between text-xs uppercase tracking-[0.16em] text-ink-mute">
          <span>Placed {formatDateTime(o.created_at)}</span>
          <span>{o.status}</span>
        </div>
        <ul className="mt-6 divide-y divide-line border-y border-line">
          {o.order_items.map((i: { id: string; product_name: string; variant_name: string | null; quantity: number; line_total: number }) => (
            <li key={i.id} className="flex justify-between py-3 text-sm">
              <span>{i.product_name} <span className="text-ink-mute">· {i.variant_name} × {i.quantity}</span></span>
              <span>{formatINR(i.line_total)}</span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex justify-between font-serif text-2xl"><span>Total</span><span>{formatINR(o.total)}</span></div>
      </div>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button asChild><Link href={`/account/orders/${o.id}`}>View order</Link></Button>
        <Button variant="outline" asChild><Link href="/products">Continue shopping</Link></Button>
      </div>
    </div>
  );
}
