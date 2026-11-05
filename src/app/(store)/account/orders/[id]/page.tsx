import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/ui/smart-image";
import { notFound } from "next/navigation";
import { getMyOrder } from "@/features/account/queries";
import { StatusBadge } from "@/components/account/status-badge";
import { OrderActions } from "@/components/account/order-actions";
import { DemoTag } from "@/components/ui/primitives";
import { isRazorpayConfigured } from "@/lib/payments/razorpay";
import { cn, formatDateTime, formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "Order details", robots: { index: false } };

const TRACK = ["pending", "confirmed", "processing", "shipped", "delivered"] as const;

type Item = { id: string; product_name: string; variant_name: string | null; sku: string; image: string | null; unit_price: number; quantity: number; line_total: number; products: { slug: string } | null };
type Hist = { id: string; status: string; note: string | null; created_at: string };
type Pay = { provider: string; status: string; method: string | null; amount: number; provider_payment_id: string | null; failure_reason: string | null };

export default async function OrderDetail({ params }: PageProps<"/account/orders/[id]">) {
  const { id } = await params;
  const o = await getMyOrder(id);
  if (!o) notFound();
  const items = o.order_items as unknown as Item[];
  const history = [...(o.order_status_history as Hist[])].sort((a, b) => +new Date(a.created_at) - +new Date(b.created_at));
  const payment = (o.payments as Pay[])[0];
  const addr = o.shipping_address as Record<string, string | null>;
  const stepIndex = TRACK.indexOf(o.status as (typeof TRACK)[number]);
  const terminal = o.status === "cancelled" || o.status === "refunded";
  const canPay = o.status === "pending" && o.payment_status !== "successful" && !o.stock_released;

  return (
    <div className="space-y-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <Link href="/account/orders" className="text-xs uppercase tracking-[0.16em] text-ink-mute hover:text-espresso">← All orders</Link>
          <h2 className="mt-3 font-serif text-4xl">{o.order_number}</h2>
          <p className="mt-1 text-sm text-ink-soft">Placed {formatDateTime(o.created_at)}</p>
          {o.is_demo && <DemoTag className="mt-2">Demo order</DemoTag>}
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={o.status} />
          <StatusBadge status={o.payment_status} />
        </div>
      </div>

      {/* Tracking */}
      <section className="border border-line bg-white/40 p-6 md:p-8">
        <p className="eyebrow text-mocha">Tracking</p>
        {terminal ? (
          <p className="mt-4 font-serif text-2xl capitalize">{o.status}</p>
        ) : (
          <ol className="mt-6 grid grid-cols-5 gap-2">
            {TRACK.map((s, i) => (
              <li key={s}>
                <span className={cn("block h-0.5 transition", i <= stepIndex ? "bg-espresso" : "bg-line")} />
                <span className={cn("mt-3 block text-[0.6rem] uppercase tracking-[0.14em] sm:text-[0.68rem]", i <= stepIndex ? "text-espresso" : "text-ink-mute")}>{s}</span>
              </li>
            ))}
          </ol>
        )}
        <ul className="mt-8 space-y-3 border-t border-line pt-6 text-sm">
          {history.map((h) => (
            <li key={h.id} className="flex gap-4">
              <span className="w-40 shrink-0 text-ink-mute">{formatDateTime(h.created_at)}</span>
              <span className="capitalize">{h.status}</span>
              {h.note && <span className="text-ink-soft">— {h.note}</span>}
            </li>
          ))}
        </ul>
        {(canPay || o.status === "pending") && (
          <div className="mt-6 border-t border-line pt-6">
            <OrderActions orderId={o.id} canPay={canPay} canCancel={o.status === "pending" && o.payment_status !== "successful"} razorpay={isRazorpayConfigured()} />
          </div>
        )}
      </section>

      <section className="grid gap-10 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <h3 className="eyebrow text-espresso">Items</h3>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {items.map((i) => (
              <li key={i.id} className="flex gap-4 py-4">
                <span className="relative aspect-[3/4] w-16 shrink-0 overflow-hidden bg-champagne">
                  {i.image && <Image src={i.image} alt="" fill sizes="64px" quality={50} className="object-cover" />}
                </span>
                <div className="flex-1 text-sm">
                  {i.products?.slug ? <Link href={`/products/${i.products.slug}`} className="font-serif text-lg hover:underline">{i.product_name}</Link> : <p className="font-serif text-lg">{i.product_name}</p>}
                  <p className="text-ink-mute">{i.variant_name} · SKU {i.sku}</p>
                  <p className="text-ink-soft">{formatINR(i.unit_price)} × {i.quantity}</p>
                </div>
                <p className="text-sm tabular-nums">{formatINR(i.line_total)}</p>
              </li>
            ))}
          </ul>
          <dl className="ml-auto mt-6 max-w-xs space-y-2 text-sm">
            <div className="flex justify-between"><dt className="text-ink-soft">Subtotal</dt><dd>{formatINR(o.subtotal)}</dd></div>
            {Number(o.discount_total) > 0 && <div className="flex justify-between text-success"><dt>Discount {o.coupon_code && `(${o.coupon_code})`}</dt><dd>− {formatINR(o.discount_total)}</dd></div>}
            <div className="flex justify-between"><dt className="text-ink-soft">Shipping</dt><dd>{Number(o.shipping_total) === 0 ? "Complimentary" : formatINR(o.shipping_total)}</dd></div>
            <div className="flex justify-between border-t border-line pt-2 font-serif text-2xl"><dt>Total</dt><dd>{formatINR(o.total)}</dd></div>
          </dl>
        </div>
        <div className="space-y-8 text-sm">
          <div>
            <h3 className="eyebrow text-espresso">Delivery address</h3>
            <p className="mt-3 leading-relaxed text-ink-soft">
              {addr.full_name}<br />{addr.line1}{addr.line2 ? `, ${addr.line2}` : ""}<br />{addr.city}, {addr.state} {addr.postal_code}<br />{addr.phone}
            </p>
          </div>
          {payment && (
            <div>
              <h3 className="eyebrow text-espresso">Payment</h3>
              <p className="mt-3 text-ink-soft">
                <span className="capitalize">{payment.provider === "demo" ? "Demo (simulated)" : "Razorpay"}</span> · <span className="capitalize">{payment.status}</span>
                {payment.method && <><br />Method: {payment.method}</>}
                {payment.failure_reason && <><br /><span className="text-danger">{payment.failure_reason}</span></>}
              </p>
            </div>
          )}
          {o.notes && (
            <div>
              <h3 className="eyebrow text-espresso">Notes</h3>
              <p className="mt-3 text-ink-soft">{o.notes}</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
