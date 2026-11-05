import Link from "next/link";
import Image from "next/image";
import { requireStaff } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { formatDate, formatDateTime, formatINR, formatINRCompact } from "@/lib/utils";
import { DemoBadge, Panel, PageHeader, StatCard, StatusBadge, Table, Td, Th, THead, Tr, EmptyRow } from "@/components/admin/ui";
import { ChartPanel } from "@/components/dashboard/chart-panel";
import { AppointmentTrendChart, DailyOrdersChart, DivisionSalesChart, RevenueTrendChart, TopProductsChart } from "@/components/dashboard/lazy-charts";
import { getAppointmentSeries, getDailySales, getDivisionSales, getOverview, getRevenueSeries, getTopProducts, safe } from "@/features/analytics/queries";
import { listOrders } from "@/features/admin/orders";
import { listLowStock } from "@/features/admin/inventory";
import { getAdminDivisions, getRecentActivity, divisionName } from "@/features/admin/common";

export const metadata = { title: "Dashboard" };

const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

export default async function DashboardPage({ searchParams }: PageProps<"/admin">) {
  const sp = await searchParams;
  const access = await requireStaff();
  const canOrders = can(access, "orders.view");
  const canStock = can(access, "inventory.manage") || can(access, "products.manage");

  const [overview, revenue, daily, divisions, top, appts, recent, lowStock, activity, allDivisions] = await Promise.all([
    getOverview(30),
    safe(getRevenueSeries(6), []),
    safe(getDailySales(30), []),
    safe(getDivisionSales(180), []),
    safe(getTopProducts(90, 6), []),
    safe(getAppointmentSeries(6), []),
    canOrders ? safe(listOrders({ pageSize: 6 }), { rows: [], total: 0, page: 1, pageSize: 6 }) : Promise.resolve(null),
    canStock ? safe(listLowStock(6), []) : Promise.resolve([]),
    safe(getRecentActivity(8), []),
    getAdminDivisions(),
  ]);

  const first = access.name.split(" ")[0] || "there";
  const hour = Number(new Intl.DateTimeFormat("en-IN", { hour: "numeric", hour12: false, timeZone: "Asia/Kolkata" }).format(new Date()));
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";

  return (
    <>
      {typeof sp.denied === "string" && (
        <p className="mb-6 border border-danger/30 bg-danger/5 px-4 py-2.5 text-sm text-danger">
          Your role doesn&apos;t include access to that area (<code className="text-xs">{sp.denied}</code>).
        </p>
      )}
      <PageHeader
        eyebrow={formatDate(new Date(), "EEEE, d MMMM yyyy")}
        title={`${greeting}, ${first}`}
        description="A live view across every RAVANTRA division — figures are calculated from database records for the last 30 days."
      />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
        {overview.canSeeSales && (
          <>
            <StatCard label="Revenue · 30d" value={formatINRCompact(overview.revenue)} delta={pct(overview.revenue, overview.revenuePrev)} hint="vs prior 30d" href={can(access, "reports.view") ? "/admin/reports" : undefined} />
            <StatCard label="Orders · 30d" value={String(overview.orders)} delta={pct(overview.orders, overview.ordersPrev)} hint={`${overview.ordersAllTime} all time`} href={canOrders ? "/admin/orders" : undefined} />
            <StatCard label="Pending orders" value={String(overview.pendingOrders)} hint="to fulfil" href={canOrders ? "/admin/orders?status=confirmed" : undefined} tone={overview.pendingOrders > 0 ? "warning" : "default"} />
          </>
        )}
        <StatCard label="Customers" value={String(overview.customers)} hint={`+${overview.newCustomers} new`} href={can(access, "customers.view") ? "/admin/customers" : undefined} />
        {overview.canSeeSalon && (
          <StatCard label="Appointments" value={String(overview.appointmentsUpcoming)} hint={`upcoming · ${overview.appointments} past 30d`} href="/admin/appointments" />
        )}
        {overview.canSeeStock && (
          <>
            <StatCard label="Active products" value={String(overview.activeProducts)} href={can(access, "products.manage") ? "/admin/products" : undefined} />
            <StatCard label="Low stock" value={String(overview.lowStock)} hint="variants at/below threshold" href={can(access, "inventory.manage") ? "/admin/inventory?stock=alert" : undefined} tone={overview.lowStock > 0 ? "warning" : "default"} />
          </>
        )}
      </div>

      {overview.canSeeSales && (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <ChartPanel
            className="xl:col-span-2"
            title="Revenue trend"
            subtitle="Paid merchandise revenue by month · last 6 months"
            table={{ columns: ["Month", "Revenue", "Orders"], rows: revenue.map((r) => [formatDate(r.month, "MMM yyyy"), formatINR(r.revenue), r.orders]) }}
          >
            <RevenueTrendChart data={revenue} />
          </ChartPanel>
          <ChartPanel
            title="Sales by division"
            subtitle="Revenue · last 180 days"
            table={{ columns: ["Division", "Revenue", "Units", "Orders"], rows: divisions.map((d) => [d.name, formatINR(d.revenue), d.units, d.orders]) }}
          >
            <DivisionSalesChart data={divisions} />
          </ChartPanel>
          <ChartPanel
            title="Order trend"
            subtitle="Paid orders per day · last 30 days"
            table={{ columns: ["Day", "Orders", "Revenue"], rows: daily.filter((d) => d.orders > 0).map((d) => [formatDate(d.day), d.orders, formatINR(d.revenue)]) }}
          >
            <DailyOrdersChart data={daily} />
          </ChartPanel>
          <ChartPanel
            className="xl:col-span-2"
            title="Product performance"
            subtitle="Best sellers by revenue · last 90 days"
            table={{ columns: ["Product", "Division", "Units", "Revenue"], rows: top.map((t) => [t.name, t.division, t.units, formatINR(t.revenue)]) }}
          >
            {top.length ? <TopProductsChart data={top} /> : <p className="py-10 text-center text-sm text-ink-mute">No paid orders in this period yet.</p>}
          </ChartPanel>
        </div>
      )}

      {overview.canSeeSalon && (
        <div className="mt-6">
          <ChartPanel
            title="Appointment trends"
            subtitle="Salon & Spa bookings by month and outcome"
            table={{ columns: ["Month", "Total", "Completed", "Cancelled / no-show", "Revenue"], rows: appts.map((a) => [formatDate(a.month, "MMM yyyy"), a.total, a.completed, a.cancelled, formatINR(a.revenue)]) }}
          >
            <AppointmentTrendChart data={appts} />
          </ChartPanel>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        {recent && (
          <div className="xl:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="font-serif text-xl">Recent transactions</h2>
              <Link href="/admin/orders" className="text-xs uppercase tracking-[0.14em] text-ink-soft hover:text-espresso">All orders →</Link>
            </div>
            <Table>
              <THead>
                <Th>Order</Th>
                <Th>Customer</Th>
                <Th>Divisions</Th>
                <Th>Status</Th>
                <Th>Payment</Th>
                <Th className="text-right">Total</Th>
              </THead>
              <tbody>
                {recent.rows.length === 0 && <EmptyRow colSpan={6}>No orders yet.</EmptyRow>}
                {recent.rows.map((o) => (
                  <Tr key={o.id}>
                    <Td>
                      <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link>
                      {o.isDemo && <DemoBadge />}
                      <p className="text-xs text-ink-mute">{formatDateTime(o.createdAt)}</p>
                    </Td>
                    <Td className="text-ink-soft">{o.customerName}</Td>
                    <Td className="text-xs text-ink-soft">{o.divisions.map((d) => divisionName(allDivisions, d)).join(", ")}</Td>
                    <Td><StatusBadge status={o.status} /></Td>
                    <Td><StatusBadge status={o.paymentStatus} /></Td>
                    <Td className="text-right tabular-nums">{formatINR(o.total)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}

        <div className="space-y-6">
          {canStock && (
            <Panel title="Low-stock alerts" action={<Link href="/admin/inventory?stock=alert" className="text-xs text-ink-soft hover:text-espresso">Inventory →</Link>} padded={false}>
              {lowStock.length === 0 ? (
                <p className="px-5 py-8 text-center text-sm text-ink-mute">All variants are above their thresholds.</p>
              ) : (
                <ul className="divide-y divide-line">
                  {lowStock.map((r) => (
                    <li key={r.variantId} className="flex items-center gap-3 px-5 py-2.5">
                      <div className="relative size-10 shrink-0 overflow-hidden bg-champagne">
                        {r.image && <Image src={r.image} alt="" fill sizes="40px" className="object-cover" quality={60} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm">{r.productName}</p>
                        <p className="truncate text-xs text-ink-mute">{r.sku} · {r.variantName}</p>
                      </div>
                      <span className={`text-sm tabular-nums ${r.quantity === 0 ? "text-danger" : "text-warning"}`}>{r.quantity === 0 ? "Out" : r.quantity}</span>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          )}
          <Panel title="Recent activity" padded={false}>
            {activity.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-ink-mute">No activity recorded yet.</p>
            ) : (
              <ol className="relative px-5 py-4">
                {activity.map((a) => (
                  <li key={a.id} className="relative border-l border-line pb-4 pl-4 last:pb-0">
                    <span className="absolute -left-[3.5px] top-1.5 size-1.5 rounded-full bg-gold" aria-hidden />
                    <p className="text-sm text-espresso">{a.summary}</p>
                    <p className="text-xs text-ink-mute">
                      {a.actor ?? "System"} · {formatDateTime(a.createdAt)}
                    </p>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>
      </div>
    </>
  );
}
