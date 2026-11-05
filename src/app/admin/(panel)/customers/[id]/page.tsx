import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, formatINR, formatInTimeZone } from "@/lib/utils";
import { DemoBadge, EmptyRow, KeyValue, PageHeader, Panel, StatCard, StatusBadge, Table, Td, Th, THead, Tr } from "@/components/admin/ui";
import { getCustomer } from "@/features/admin/customers";
import { listAppointments } from "@/features/admin/salon";

export const metadata = { title: "Customer" };

export default async function CustomerPage({ params }: PageProps<"/admin/customers/[id]">) {
  const access = await requirePermission("customers.view");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const showAppts = can(access, "appointments.manage");
  const [c, appts] = await Promise.all([getCustomer(id), showAppts ? listAppointments({ scope: "all", customerId: id }) : Promise.resolve([])]);
  if (!c) notFound();
  const canOrders = can(access, "orders.view");

  // merged activity timeline
  const timeline = [
    ...c.recentOrders.map((o) => ({ at: o.createdAt, text: `Placed order ${o.orderNumber} · ${formatINR(o.total)}`, href: canOrders ? `/admin/orders/${o.id}` : undefined })),
    ...appts.map((a) => ({ at: a.startsAt, text: `${a.serviceName} with ${a.stylistName} — ${a.status.replace("_", " ")}`, href: undefined as string | undefined })),
    { at: c.createdAt, text: "Created account", href: undefined as string | undefined },
  ]
    .sort((a, b) => +new Date(b.at) - +new Date(a.at))
    .slice(0, 12);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/customers", label: "Customers" }}
        eyebrow={`Customer since ${formatDate(c.createdAt, "MMMM yyyy")}`}
        title={c.fullName}
        description={c.isDemo ? <DemoBadge /> : undefined}
      />
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
        <StatCard label="Orders" value={String(c.orders)} />
        <StatCard label="Paid spend" value={formatINR(c.spend)} />
        <StatCard label="Appointments" value={String(c.appointments)} />
        <StatCard label="Wishlist" value={String(c.wishlistCount)} hint="saved items" />
      </div>
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="space-y-6 xl:col-span-2">
          {canOrders && (
            <div>
              <h2 className="mb-3 font-serif text-xl">Orders</h2>
              <Table>
                <THead>
                  <Th>Order</Th>
                  <Th>Date</Th>
                  <Th>Status</Th>
                  <Th>Payment</Th>
                  <Th className="text-right">Total</Th>
                </THead>
                <tbody>
                  {c.recentOrders.length === 0 && <EmptyRow colSpan={5}>No orders yet.</EmptyRow>}
                  {c.recentOrders.map((o) => (
                    <Tr key={o.id}>
                      <Td><Link href={`/admin/orders/${o.id}`} className="hover:underline">{o.orderNumber}</Link></Td>
                      <Td className="text-xs text-ink-soft">{formatDateTime(o.createdAt)}</Td>
                      <Td><StatusBadge status={o.status} /></Td>
                      <Td><StatusBadge status={o.paymentStatus} /></Td>
                      <Td className="text-right tabular-nums">{formatINR(o.total)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
          {showAppts && (
            <div>
              <h2 className="mb-3 font-serif text-xl">Appointments</h2>
              <Table>
                <THead>
                  <Th>When (IST)</Th>
                  <Th>Service</Th>
                  <Th>Stylist</Th>
                  <Th>Status</Th>
                  <Th className="text-right">Price</Th>
                </THead>
                <tbody>
                  {appts.length === 0 && <EmptyRow colSpan={5}>No appointments yet.</EmptyRow>}
                  {appts.map((a) => (
                    <Tr key={a.id}>
                      <Td className="text-xs">{formatInTimeZone(a.startsAt, "Asia/Kolkata", "d MMM yyyy, h:mm a")}</Td>
                      <Td>{a.serviceName}</Td>
                      <Td className="text-ink-soft">{a.stylistName}</Td>
                      <Td><StatusBadge status={a.status} /></Td>
                      <Td className="text-right tabular-nums">{formatINR(a.price)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
            </div>
          )}
        </div>
        <div className="space-y-6">
          <Panel title="Contact">
            <KeyValue
              items={[
                ["Email", <a key="e" href={`mailto:${c.email}`} className="hover:underline">{c.email}</a>],
                ["Phone", c.phone ?? "—"],
              ]}
            />
          </Panel>
          <Panel title="Saved addresses">
            {c.addresses.length === 0 ? (
              <p className="text-sm text-ink-mute">No saved addresses.</p>
            ) : (
              <ul className="space-y-3 text-sm">
                {c.addresses.map((a) => (
                  <li key={a.id}>
                    <p className="text-xs uppercase tracking-[0.12em] text-mocha">{a.label}{a.isDefault && " · default"}</p>
                    <p className="text-ink-soft">{a.line}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          <Panel title="Activity">
            <ol>
              {timeline.map((t, i) => (
                <li key={i} className="relative border-l border-line pb-4 pl-4 last:pb-0">
                  <span className="absolute -left-[3.5px] top-1.5 size-1.5 rounded-full bg-gold" aria-hidden />
                  {t.href ? <Link href={t.href} className="text-sm hover:underline">{t.text}</Link> : <p className="text-sm">{t.text}</p>}
                  <p className="text-xs text-ink-mute">{formatDateTime(t.at)}</p>
                </li>
              ))}
            </ol>
          </Panel>
        </div>
      </div>
    </>
  );
}
