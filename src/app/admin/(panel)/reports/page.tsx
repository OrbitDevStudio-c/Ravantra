import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, formatINR, formatINRCompact } from "@/lib/utils";
import { PageHeader, StatCard, Table, Td, Th, THead, Tr, EmptyRow } from "@/components/admin/ui";
import { ChartPanel } from "@/components/dashboard/chart-panel";
import { AppointmentTrendChart, CustomerGrowthChart, DivisionSalesChart, RevenueTrendChart, TopProductsChart } from "@/components/dashboard/lazy-charts";
import {
  getAppointmentSeries,
  getCustomerGrowth,
  getDivisionSales,
  getInventoryByDivision,
  getOrderStatus,
  getOverview,
  getRevenueSeries,
  getServicePopularity,
  getTopProducts,
  safe,
} from "@/features/analytics/queries";
import { str } from "@/features/admin/common";
import { cn } from "@/lib/utils";

export const metadata = { title: "Reports" };

const RANGES = [30, 90, 180, 365] as const;

export default async function ReportsPage({ searchParams }: PageProps<"/admin/reports">) {
  await requirePermission("reports.view");
  const sp = await searchParams;
  const days = RANGES.find((r) => String(r) === str(sp.days)) ?? 90;
  const months = days <= 90 ? 6 : 12;

  const [overview, revenue, divisions, top, statuses, appts, services, growth, inventory] = await Promise.all([
    getOverview(days),
    safe(getRevenueSeries(months), []),
    safe(getDivisionSales(days), []),
    safe(getTopProducts(days, 10), []),
    safe(getOrderStatus(), []),
    safe(getAppointmentSeries(months), []),
    safe(getServicePopularity(days), []),
    safe(getCustomerGrowth(months), []),
    safe(getInventoryByDivision(), []),
  ]);

  const aov = overview.orders ? overview.revenue / overview.orders : 0;
  const totalStatus = statuses.reduce((a, s) => a + s.count, 0);

  return (
    <>
      <PageHeader
        title="Reports & analytics"
        description="Every figure is computed in Postgres from live orders, appointments, customers and inventory — scoped to the divisions your role covers."
        actions={
          <div className="flex border border-line bg-white" role="group" aria-label="Date range">
            {RANGES.map((r) => (
              <Link key={r} href={`/admin/reports?days=${r}`} className={cn("px-3 py-2 text-xs tabular-nums", r === days ? "bg-espresso text-ivory" : "text-ink-soft hover:text-espresso")}>
                {r === 365 ? "12 mo" : `${r}d`}
              </Link>
            ))}
          </div>
        }
      />

      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
        <StatCard label={`Revenue · ${days}d`} value={formatINRCompact(overview.revenue)} delta={overview.revenuePrev ? ((overview.revenue - overview.revenuePrev) / overview.revenuePrev) * 100 : null} hint="vs prior period" />
        <StatCard label="All-time revenue" value={formatINRCompact(overview.revenueAllTime)} />
        <StatCard label="Paid orders" value={String(overview.orders)} />
        <StatCard label="Avg. order value" value={formatINR(aov)} />
        <StatCard label="Units sold" value={String(overview.units)} />
        <StatCard label="Salon revenue" value={formatINRCompact(overview.appointmentRevenue)} hint="completed" />
      </div>

      {overview.canSeeSales && (
        <div className="grid gap-6 xl:grid-cols-3">
          <ChartPanel className="xl:col-span-2" title="Monthly revenue" subtitle={`Last ${months} months`} table={{ columns: ["Month", "Revenue", "Orders"], rows: revenue.map((r) => [formatDate(r.month, "MMM yyyy"), formatINR(r.revenue), r.orders]) }}>
            <RevenueTrendChart data={revenue} />
          </ChartPanel>
          <ChartPanel title="Revenue by division" subtitle={`Last ${days} days`} table={{ columns: ["Division", "Revenue", "Units", "Orders"], rows: divisions.map((d) => [d.name, formatINR(d.revenue), d.units, d.orders]) }}>
            <DivisionSalesChart data={divisions} />
          </ChartPanel>
          <ChartPanel className="xl:col-span-2" title="Best-selling products" subtitle={`By revenue · last ${days} days`} table={{ columns: ["Product", "Division", "Units", "Revenue"], rows: top.map((t) => [t.name, t.division, t.units, formatINR(t.revenue)]) }}>
            {top.length ? <TopProductsChart data={top} /> : <p className="py-10 text-center text-sm text-ink-mute">No sales in this period.</p>}
          </ChartPanel>
          <section className="border border-line bg-white p-5">
            <h2 className="font-serif text-xl">Order status mix</h2>
            <p className="mb-4 text-xs text-ink-mute">All time</p>
            <ul className="space-y-3">
              {statuses.map((s) => (
                <li key={s.status}>
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{s.status}</span>
                    <span className="tabular-nums text-ink-soft">{s.count}</span>
                  </div>
                  <div className="mt-1 h-1.5 bg-ivory-2">
                    <div className="h-full bg-espresso" style={{ width: `${totalStatus ? (s.count / totalStatus) * 100 : 0}%` }} />
                  </div>
                </li>
              ))}
              {statuses.length === 0 && <li className="text-sm text-ink-mute">No orders yet.</li>}
            </ul>
          </section>
        </div>
      )}

      {overview.canSeeSalon && (
        <div className="mt-6 grid gap-6 xl:grid-cols-3">
          <ChartPanel className="xl:col-span-2" title="Appointment report" subtitle={`Bookings by month · last ${months} months`} table={{ columns: ["Month", "Total", "Completed", "Cancelled / no-show", "Revenue"], rows: appts.map((a) => [formatDate(a.month, "MMM yyyy"), a.total, a.completed, a.cancelled, formatINR(a.revenue)]) }}>
            <AppointmentTrendChart data={appts} />
          </ChartPanel>
          <div>
            <h2 className="mb-3 font-serif text-xl">Service popularity</h2>
            <Table className="[&_table]:min-w-0">
              <THead>
                <Th>Service</Th>
                <Th className="text-right">Bookings</Th>
                <Th className="text-right">Revenue</Th>
              </THead>
              <tbody>
                {services.length === 0 && <EmptyRow colSpan={3}>No bookings.</EmptyRow>}
                {services.map((s) => (
                  <Tr key={s.serviceId}>
                    <Td>{s.name}</Td>
                    <Td className="text-right tabular-nums">{s.bookings}</Td>
                    <Td className="text-right tabular-nums">{formatINR(s.revenue)}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        </div>
      )}

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <ChartPanel title="Customer growth" subtitle="Total registered customers" table={{ columns: ["Month", "New", "Total"], rows: growth.map((g) => [formatDate(g.month, "MMM yyyy"), g.newCustomers, g.total]) }}>
          <CustomerGrowthChart data={growth} />
        </ChartPanel>
        {overview.canSeeStock && (
          <div className="xl:col-span-2">
            <h2 className="mb-3 font-serif text-xl">Inventory report</h2>
            <Table>
              <THead>
                <Th>Division</Th>
                <Th className="text-right">Variants</Th>
                <Th className="text-right">Units</Th>
                <Th className="text-right">Retail value</Th>
                <Th className="text-right">Low</Th>
                <Th className="text-right">Out</Th>
              </THead>
              <tbody>
                {inventory.length === 0 && <EmptyRow colSpan={6}>No inventory data.</EmptyRow>}
                {inventory.map((i) => (
                  <Tr key={i.divisionId}>
                    <Td>{i.name}</Td>
                    <Td className="text-right tabular-nums">{i.variants}</Td>
                    <Td className="text-right tabular-nums">{i.units.toLocaleString("en-IN")}</Td>
                    <Td className="text-right tabular-nums">{formatINR(i.stockValue)}</Td>
                    <Td className="text-right tabular-nums text-warning">{i.lowStock}</Td>
                    <Td className="text-right tabular-nums text-danger">{i.outOfStock}</Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </div>
        )}
      </div>

      {overview.canSeeSales && (
        <div className="mt-6">
          <h2 className="mb-3 font-serif text-xl">Monthly performance</h2>
          <Table>
            <THead>
              <Th>Month</Th>
              <Th className="text-right">Revenue</Th>
              <Th className="text-right">Orders</Th>
              <Th className="text-right">AOV</Th>
              <Th className="text-right">New customers</Th>
              <Th className="text-right">Appointments</Th>
              <Th className="text-right">MoM</Th>
            </THead>
            <tbody>
              {[...revenue].reverse().map((r) => {
                const idx = revenue.findIndex((x) => x.month === r.month);
                const prev = idx > 0 ? revenue[idx - 1].revenue : 0;
                const mom = prev ? ((r.revenue - prev) / prev) * 100 : null;
                return (
                  <Tr key={r.month}>
                    <Td>{formatDate(r.month, "MMMM yyyy")}</Td>
                    <Td className="text-right tabular-nums">{formatINR(r.revenue)}</Td>
                    <Td className="text-right tabular-nums">{r.orders}</Td>
                    <Td className="text-right tabular-nums">{r.orders ? formatINR(r.revenue / r.orders) : "—"}</Td>
                    <Td className="text-right tabular-nums">{growth.find((g) => g.month === r.month)?.newCustomers ?? "—"}</Td>
                    <Td className="text-right tabular-nums">{appts.find((a) => a.month === r.month)?.total ?? "—"}</Td>
                    <Td className={cn("text-right tabular-nums", mom == null ? "text-ink-mute" : mom >= 0 ? "text-success" : "text-danger")}>{mom == null ? "—" : `${mom >= 0 ? "+" : ""}${mom.toFixed(0)}%`}</Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
        </div>
      )}
    </>
  );
}
