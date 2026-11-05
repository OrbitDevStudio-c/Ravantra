import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/ui/smart-image";
import { getMyAppointments, getMyOrders } from "@/features/account/queries";
import { StatusBadge } from "@/components/account/status-badge";
import { WishlistCount } from "@/components/account/wishlist-count";
import { formatDate, formatDateTime, formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "My account", robots: { index: false } };

export default async function AccountOverview() {
  const [orders, appts] = await Promise.all([getMyOrders(5), getMyAppointments()]);
  const upcoming = appts.filter((a) => new Date(a.starts_at) > new Date() && ["pending", "confirmed"].includes(a.status)).sort((a, b) => +new Date(a.starts_at) - +new Date(b.starts_at));

  return (
    <div className="space-y-14">
      <dl className="grid grid-cols-3 border border-line">
        <Stat label="Orders" value={String(orders.length)} href="/account/orders" />
        <Stat label="Upcoming visits" value={String(upcoming.length)} href="/account/appointments" />
        <div className="border-l border-line p-5 md:p-7">
          <dt className="eyebrow text-[0.6rem] text-ink-mute">Wishlist</dt>
          <dd className="mt-2 font-serif text-4xl"><Link href="/account/wishlist"><WishlistCount /></Link></dd>
        </div>
      </dl>

      <section>
        <div className="flex items-baseline justify-between border-b border-line pb-4">
          <h2 className="font-serif text-3xl">Next appointment</h2>
          <Link href="/salon-spa/book" className="text-xs uppercase tracking-[0.16em] underline-offset-4 hover:underline">Book new</Link>
        </div>
        {upcoming[0] ? (
          <div className="mt-6 flex items-center gap-5">
            {upcoming[0].services?.image && (
              <span className="relative size-20 shrink-0 overflow-hidden bg-champagne">
                <Image src={upcoming[0].services.image} alt="" fill sizes="80px" quality={50} className="object-cover" />
              </span>
            )}
            <div className="flex-1">
              <p className="font-serif text-2xl">{upcoming[0].services?.name}</p>
              <p className="text-sm text-ink-soft">with {upcoming[0].stylists?.name} · {formatDateTime(upcoming[0].starts_at)}</p>
            </div>
            <StatusBadge status={upcoming[0].status} />
          </div>
        ) : (
          <p className="mt-6 text-sm text-ink-soft">No upcoming visits. <Link href="/salon-spa" className="underline underline-offset-4">Explore Salon &amp; Spa</Link></p>
        )}
      </section>

      <section>
        <div className="flex items-baseline justify-between border-b border-line pb-4">
          <h2 className="font-serif text-3xl">Recent orders</h2>
          <Link href="/account/orders" className="text-xs uppercase tracking-[0.16em] underline-offset-4 hover:underline">View all</Link>
        </div>
        {orders.length === 0 ? (
          <p className="mt-6 text-sm text-ink-soft">No orders yet. <Link href="/products" className="underline underline-offset-4">Start shopping</Link></p>
        ) : (
          <ul className="divide-y divide-line">
            {orders.slice(0, 3).map((o) => (
              <li key={o.id}>
                <Link href={`/account/orders/${o.id}`} className="flex items-center gap-4 py-5 transition hover:bg-white/40">
                  <div className="flex -space-x-3">
                    {o.order_items.slice(0, 3).map((i) => (
                      <span key={i.id} className="relative size-12 overflow-hidden border-2 border-ivory bg-champagne">
                        {i.image && <Image src={i.image} alt="" fill sizes="48px" quality={40} className="object-cover" />}
                      </span>
                    ))}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">{o.order_number}</p>
                    <p className="text-xs text-ink-mute">{formatDate(o.created_at)} · {o.order_items.length} item{o.order_items.length > 1 ? "s" : ""}</p>
                  </div>
                  <StatusBadge status={o.status} />
                  <span className="hidden w-24 text-right text-sm sm:block">{formatINR(o.total)}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, href }: { label: string; value: string; href: string }) {
  return (
    <Link href={href} className="border-l border-line p-5 transition first:border-l-0 hover:bg-white/50 md:p-7">
      <dt className="eyebrow text-[0.6rem] text-ink-mute">{label}</dt>
      <dd className="mt-2 font-serif text-4xl">{value}</dd>
    </Link>
  );
}
