import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { formatDateTime, formatINR } from "@/lib/utils";
import { DemoBadge, EmptyRow, PageHeader, Pagination, StatusBadge, Table, Td, Th, THead, Tr } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/client";
import { Input, Select } from "@/components/ui/primitives";
import { listOrders } from "@/features/admin/orders";
import { divisionName, getAdminDivisions, pageNum, str } from "@/features/admin/common";

export const metadata = { title: "Orders" };

export default async function OrdersPage({ searchParams }: PageProps<"/admin/orders">) {
  await requirePermission("orders.view");
  const sp = await searchParams;
  const params = { q: str(sp.q), status: str(sp.status), payment: str(sp.payment), division: str(sp.division) };
  const page = pageNum(sp.page);
  const [result, divisions] = await Promise.all([listOrders({ ...params, page, pageSize: 20 }), getAdminDivisions()]);
  const productDivisions = divisions.filter((d) => d.kind === "products");

  return (
    <>
      <PageHeader title="Orders" description="Every order across product divisions. Managers only see orders containing items from their divisions." />
      <FilterBar>
        <Input boxed name="q" defaultValue={params.q} placeholder="Order no., name or email" className="w-64" aria-label="Search orders" />
        <Select boxed name="status" defaultValue={params.status ?? ""} className="w-40" aria-label="Status">
          <option value="">All statuses</option>
          {["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"].map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </Select>
        <Select boxed name="payment" defaultValue={params.payment ?? ""} className="w-40" aria-label="Payment">
          <option value="">All payments</option>
          {["pending", "successful", "failed", "refunded"].map((s) => (
            <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>
          ))}
        </Select>
        <Select boxed name="division" defaultValue={params.division ?? ""} className="w-44" aria-label="Division">
          <option value="">All divisions</option>
          {productDivisions.map((d) => (
            <option key={d.id} value={d.id}>{d.shortName}</option>
          ))}
        </Select>
      </FilterBar>

      <Table>
        <THead>
          <Th>Order</Th>
          <Th>Placed</Th>
          <Th>Customer</Th>
          <Th>Divisions</Th>
          <Th className="text-right">Items</Th>
          <Th>Status</Th>
          <Th>Payment</Th>
          <Th className="text-right">Total</Th>
        </THead>
        <tbody>
          {result.rows.length === 0 && <EmptyRow colSpan={8}>No orders match these filters.</EmptyRow>}
          {result.rows.map((o) => (
            <Tr key={o.id}>
              <Td>
                <Link href={`/admin/orders/${o.id}`} className="font-medium hover:underline">{o.orderNumber}</Link>
                {o.isDemo && <DemoBadge />}
              </Td>
              <Td className="whitespace-nowrap text-xs text-ink-soft">{formatDateTime(o.createdAt)}</Td>
              <Td>
                <p>{o.customerName}</p>
                <p className="text-xs text-ink-mute">{o.customerEmail}</p>
              </Td>
              <Td className="text-xs text-ink-soft">{o.divisions.map((d) => divisionName(divisions, d)).join(", ")}</Td>
              <Td className="text-right tabular-nums">{o.itemCount}</Td>
              <Td><StatusBadge status={o.status} /></Td>
              <Td><StatusBadge status={o.paymentStatus} /></Td>
              <Td className="text-right tabular-nums">{formatINR(o.total)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      <Pagination page={result.page} pageSize={result.pageSize} total={result.total} basePath="/admin/orders" params={params} />
    </>
  );
}
