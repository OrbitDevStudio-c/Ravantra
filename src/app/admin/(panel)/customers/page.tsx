import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, formatINR, initials } from "@/lib/utils";
import { DemoBadge, EmptyRow, PageHeader, Table, Td, Th, THead, Tr } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/client";
import { Input } from "@/components/ui/primitives";
import { listCustomers } from "@/features/admin/customers";
import { str } from "@/features/admin/common";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: PageProps<"/admin/customers">) {
  await requirePermission("customers.view");
  const sp = await searchParams;
  const q = str(sp.q);
  const rows = await listCustomers(q);
  const total = rows.reduce((a, r) => a + r.spend, 0);

  return (
    <>
      <PageHeader title="Customers" description={`${rows.length} customers · one account across every division · ${formatINR(total)} lifetime paid spend shown.`} />
      <FilterBar>
        <Input boxed name="q" defaultValue={q} placeholder="Name or email" className="w-64" aria-label="Search customers" />
      </FilterBar>
      <Table>
        <THead>
          <Th>Customer</Th>
          <Th>Phone</Th>
          <Th>Joined</Th>
          <Th className="text-right">Orders</Th>
          <Th className="text-right">Appointments</Th>
          <Th className="text-right">Paid spend</Th>
        </THead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={6}>No customers found.</EmptyRow>}
          {rows.map((c) => (
            <Tr key={c.id}>
              <Td>
                <Link href={`/admin/customers/${c.id}`} className="flex items-center gap-3">
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-champagne text-[0.65rem] font-medium">{initials(c.fullName)}</span>
                  <span>
                    <span className="hover:underline">{c.fullName}</span>
                    {c.isDemo && <DemoBadge />}
                    <span className="block text-xs text-ink-mute">{c.email}</span>
                  </span>
                </Link>
              </Td>
              <Td className="text-xs text-ink-soft">{c.phone ?? "—"}</Td>
              <Td className="text-xs text-ink-soft">{formatDate(c.createdAt)}</Td>
              <Td className="text-right tabular-nums">{c.orders}</Td>
              <Td className="text-right tabular-nums">{c.appointments}</Td>
              <Td className="text-right tabular-nums">{formatINR(c.spend)}</Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
