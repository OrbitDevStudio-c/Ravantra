import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/ui/smart-image";
import { Package } from "lucide-react";
import { getMyOrders } from "@/features/account/queries";
import { StatusBadge } from "@/components/account/status-badge";
import { EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatDate, formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "My orders", robots: { index: false } };

export default async function OrdersPage() {
  const orders = await getMyOrders();
  if (!orders.length) {
    return <EmptyState icon={<Package className="size-9" strokeWidth={1} />} title="No orders yet" description="When you place an order it will appear here with live tracking." action={<Button asChild><Link href="/products">Start shopping</Link></Button>} />;
  }
  return (
    <div>
      <h2 className="font-serif text-3xl">Order history</h2>
      <div className="mt-6 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-line text-left text-[0.62rem] uppercase tracking-[0.16em] text-ink-mute">
              <th className="py-3 font-medium">Order</th>
              <th className="py-3 font-medium">Placed</th>
              <th className="py-3 font-medium">Items</th>
              <th className="py-3 font-medium">Status</th>
              <th className="py-3 text-right font-medium">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {orders.map((o) => (
              <tr key={o.id} className="group">
                <td className="py-4">
                  <Link href={`/account/orders/${o.id}`} className="font-medium group-hover:underline">{o.order_number}</Link>
                </td>
                <td className="py-4 text-ink-soft">{formatDate(o.created_at)}</td>
                <td className="py-4">
                  <div className="flex -space-x-2">
                    {o.order_items.slice(0, 4).map((i) => (
                      <span key={i.id} className="relative size-9 overflow-hidden border-2 border-ivory bg-champagne">
                        {i.image && <Image src={i.image} alt="" fill sizes="36px" quality={40} className="object-cover" />}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="py-4"><StatusBadge status={o.status} />{o.payment_status !== "successful" && o.status === "pending" && <span className="ml-2 text-[0.65rem] text-warning">Unpaid</span>}</td>
                <td className="py-4 text-right tabular-nums">{formatINR(o.total)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
