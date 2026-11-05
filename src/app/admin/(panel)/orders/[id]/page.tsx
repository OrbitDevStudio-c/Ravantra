import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { formatDateTime, formatINR } from "@/lib/utils";
import { DemoBadge, KeyValue, PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { getOrder, NEXT_STATUSES } from "@/features/admin/orders";
import { divisionName, getAdminDivisions } from "@/features/admin/common";
import { OrderActions } from "./order-actions";

export const metadata = { title: "Order" };

export default async function OrderDetailPage({ params }: PageProps<"/admin/orders/[id]">) {
  const access = await requirePermission("orders.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [order, divisions] = await Promise.all([getOrder(id), getAdminDivisions()]);
  if (!order) notFound();

  const canManage = (order.canManage || access.preview) && can(access, "orders.manage");
  const next = NEXT_STATUSES[order.status] ?? [];
  const addr = order.shippingAddress;

  return (
    <>
      <PageHeader
        back={{ href: "/admin/orders", label: "Orders" }}
        eyebrow={`Placed ${formatDateTime(order.createdAt)}`}
        title={order.orderNumber}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <StatusBadge status={order.status} /> <StatusBadge status={order.paymentStatus} />
            {order.isDemo && <DemoBadge />}
          </span>
        }
        actions={
          canManage ? (
            <OrderActions orderId={order.id} next={next} paid={order.paymentStatus === "successful"} refundable={order.paymentStatus === "successful" && order.status !== "refunded"} total={order.total} provider={order.payment?.provider ?? null} />
          ) : (
            <p className="max-w-xs text-xs text-ink-mute">
              {can(access, "orders.manage") ? "This order includes items from divisions outside your scope, so it's read-only for you." : "Read-only — your role can view orders but not fulfil them."}
            </p>
          )
        }
      />

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          <Panel title={`Items (${order.itemCount})`} padded={false}>
            <ul className="divide-y divide-line">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-champagne">
                    {i.image && <Image src={i.image} alt="" fill sizes="48px" className="object-cover" quality={60} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm">{i.productName}</p>
                    <p className="text-xs text-ink-mute">
                      {i.variantName} · {i.sku} · {divisionName(divisions, i.divisionId)}
                    </p>
                  </div>
                  <p className="text-sm tabular-nums text-ink-soft">{formatINR(i.unitPrice)} × {i.quantity}</p>
                  <p className="w-24 text-right text-sm tabular-nums">{formatINR(i.lineTotal)}</p>
                </li>
              ))}
            </ul>
            <div className="border-t border-line px-5 py-4">
              <dl className="ml-auto max-w-xs space-y-1.5 text-sm tabular-nums">
                <div className="flex justify-between"><dt className="text-ink-mute">Subtotal</dt><dd>{formatINR(order.subtotal)}</dd></div>
                {order.discountTotal > 0 && (
                  <div className="flex justify-between"><dt className="text-ink-mute">Discount {order.couponCode && `(${order.couponCode})`}</dt><dd>−{formatINR(order.discountTotal)}</dd></div>
                )}
                <div className="flex justify-between"><dt className="text-ink-mute">Shipping</dt><dd>{order.shippingTotal ? formatINR(order.shippingTotal) : "Free"}</dd></div>
                <div className="flex justify-between border-t border-line pt-1.5 font-medium"><dt>Total</dt><dd>{formatINR(order.total)}</dd></div>
              </dl>
            </div>
          </Panel>

          <Panel title="Status history">
            <ol className="space-y-0">
              {order.history.map((h, idx) => (
                <li key={idx} className="relative border-l border-line pb-5 pl-5 last:pb-0">
                  <span className="absolute -left-[4.5px] top-1 size-2 rounded-full bg-espresso" aria-hidden />
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={h.status} />
                    <span className="text-xs text-ink-mute">{formatDateTime(h.createdAt)}</span>
                  </div>
                  {h.note && <p className="mt-1 text-sm text-ink-soft">{h.note}</p>}
                </li>
              ))}
            </ol>
          </Panel>
        </div>

        <div className="space-y-6">
          <Panel title="Customer">
            <KeyValue
              items={[
                ["Name", order.customerName],
                ["Email", <a key="e" href={`mailto:${order.customerEmail}`} className="hover:underline">{order.customerEmail}</a>],
                ["Phone", order.customerPhone ?? "—"],
              ]}
            />
            {can(access, "customers.view") && (
              <Link href={`/admin/customers/${order.userId}`} className="mt-4 inline-block text-xs uppercase tracking-[0.14em] text-ink-soft hover:text-espresso">
                Customer profile →
              </Link>
            )}
          </Panel>
          <Panel title="Shipping address">
            <address className="text-sm not-italic leading-relaxed text-ink-soft">
              {addr.full_name}<br />
              {addr.line1}{addr.line2 ? <>, {addr.line2}</> : null}<br />
              {addr.city}, {addr.state} {addr.postal_code}<br />
              {addr.country ?? "India"} · {addr.phone}
            </address>
          </Panel>
          <Panel title="Payment">
            {order.payment ? (
              <KeyValue
                items={[
                  ["Provider", <span key="p" className="capitalize">{order.payment.provider}{order.payment.provider === "demo" && " (simulated)"}</span>],
                  ["Status", <StatusBadge key="s" status={order.payment.status} />],
                  ["Amount", formatINR(order.payment.amount)],
                  ["Method", order.payment.method ?? "—"],
                  ["Gateway order", <code key="o" className="text-xs">{order.payment.providerOrderId ?? "—"}</code>],
                  ["Payment id", <code key="i" className="text-xs">{order.payment.providerPaymentId ?? "—"}</code>],
                  ...(order.payment.refundedAmount > 0 ? ([["Refunded", formatINR(order.payment.refundedAmount)]] as [string, string][]) : []),
                  ...(order.payment.failureReason ? ([["Note", order.payment.failureReason]] as [string, string][]) : []),
                ]}
              />
            ) : (
              <p className="text-sm text-ink-mute">No payment record.</p>
            )}
          </Panel>
          {order.notes && (
            <Panel title="Customer note">
              <p className="text-sm text-ink-soft">{order.notes}</p>
            </Panel>
          )}
        </div>
      </div>
    </>
  );
}
