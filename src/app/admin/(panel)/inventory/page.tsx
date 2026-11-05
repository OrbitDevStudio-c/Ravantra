import Image from "next/image";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { formatDateTime, formatINR } from "@/lib/utils";
import { EmptyRow, PageHeader, StatusBadge, Table, Tabs, Td, Th, THead, Tr } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/client";
import { Badge, Input, Select } from "@/components/ui/primitives";
import { listInventory, listMovements } from "@/features/admin/inventory";
import { divisionName, getAdminDivisions, str } from "@/features/admin/common";
import { getInventoryByDivision, safe } from "@/features/analytics/queries";
import { scopedDivisions } from "@/lib/auth/permissions";
import { AdjustStock, ThresholdEditor } from "./inventory-controls";

export const metadata = { title: "Inventory" };

export default async function InventoryPage({ searchParams }: PageProps<"/admin/inventory">) {
  const access = await requirePermission("inventory.manage");
  const sp = await searchParams;
  const view = str(sp.view) === "movements" ? "movements" : "stock";
  const division = str(sp.division);
  const stock = str(sp.stock);
  const q = str(sp.q);
  const reason = str(sp.reason);
  const variant = str(sp.variant);

  const scope = scopedDivisions(access, "inventory.manage");
  const allDivisions = await getAdminDivisions();
  const divisions = allDivisions.filter((d) => d.kind === "products" && (!scope || scope.includes(d.id)));

  const [summary, rows, movements] = await Promise.all([
    safe(getInventoryByDivision(), []),
    view === "stock" ? listInventory({ division, stock, q }) : Promise.resolve([]),
    view === "movements" ? listMovements({ division, reason, variant }) : Promise.resolve([]),
  ]);

  const qs = (extra: Record<string, string>) => {
    const p = new URLSearchParams();
    if (division) p.set("division", division);
    Object.entries(extra).forEach(([k, v]) => v && p.set(k, v));
    return `/admin/inventory${p.toString() ? `?${p}` : ""}`;
  };

  return (
    <>
      <PageHeader title="Inventory" description="Live stock per variant. Every change is written through a locked, audited database function — quantities can't be edited directly." />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {summary.map((s) => (
          <Link key={s.divisionId} href={`/admin/inventory?division=${s.divisionId}`} className="border border-line bg-white p-4 hover:border-line-strong">
            <p className="eyebrow text-[0.6rem] text-ink-mute">{s.name}</p>
            <p className="mt-2 font-serif text-2xl tabular-nums">{s.units.toLocaleString("en-IN")} <span className="text-sm text-ink-mute">units</span></p>
            <p className="mt-1 text-xs text-ink-soft tabular-nums">
              {s.variants} variants · {formatINR(s.stockValue)} at retail
            </p>
            <p className="mt-2 flex gap-2 text-[0.7rem]">
              {s.lowStock > 0 && <Badge tone="warning">{s.lowStock} low</Badge>}
              {s.outOfStock > 0 && <Badge tone="danger">{s.outOfStock} out</Badge>}
              {s.lowStock === 0 && s.outOfStock === 0 && <Badge tone="success">Healthy</Badge>}
            </p>
          </Link>
        ))}
      </div>

      <Tabs
        active={view}
        tabs={[
          { key: "stock", label: "Stock levels", href: qs({}) },
          { key: "movements", label: "Movement history", href: qs({ view: "movements" }) },
        ]}
      />

      {view === "stock" ? (
        <>
          <FilterBar>
            <input type="hidden" name="view" value="stock" />
            <Input boxed name="q" defaultValue={q} placeholder="SKU or product" className="w-56" aria-label="Search" />
            <Select boxed name="division" defaultValue={division ?? ""} className="w-44" aria-label="Division">
              <option value="">All divisions</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.shortName}</option>)}
            </Select>
            <Select boxed name="stock" defaultValue={stock ?? ""} className="w-44" aria-label="Stock level">
              <option value="">Any stock level</option>
              <option value="alert">Needs attention</option>
              <option value="low">Low stock</option>
              <option value="out">Out of stock</option>
            </Select>
          </FilterBar>
          <Table>
            <THead>
              <Th>Product / variant</Th>
              <Th>SKU</Th>
              <Th>Division</Th>
              <Th>Availability</Th>
              <Th className="text-right">On hand</Th>
              <Th>Alert at</Th>
              <Th className="text-right">Actions</Th>
            </THead>
            <tbody>
              {rows.length === 0 && <EmptyRow colSpan={7}>No variants match.</EmptyRow>}
              {rows.map((r) => {
                const state = r.quantity === 0 ? "out" : r.quantity <= r.threshold ? "low" : "ok";
                return (
                  <Tr key={r.variantId}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="relative size-10 shrink-0 overflow-hidden bg-champagne">
                          {r.image && <Image src={r.image} alt="" fill sizes="40px" className="object-cover" quality={60} />}
                        </div>
                        <div className="min-w-0">
                          <p className="truncate">{r.productName}</p>
                          <p className="truncate text-xs text-ink-mute">{r.variantName}{!r.isActive && " · inactive"}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">{r.sku}</Td>
                    <Td className="text-xs text-ink-soft">{divisionName(allDivisions, r.divisionId)}</Td>
                    <Td>
                      {state === "out" ? <Badge tone="danger">Out of stock</Badge> : state === "low" ? <Badge tone="warning">Low</Badge> : <Badge tone="success">In stock</Badge>}
                    </Td>
                    <Td className={`text-right font-medium tabular-nums ${state === "out" ? "text-danger" : state === "low" ? "text-warning" : ""}`}>{r.quantity}</Td>
                    <Td><ThresholdEditor variantId={r.variantId} value={r.threshold} /></Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-2">
                        <AdjustStock variantId={r.variantId} label={`${r.productName} — ${r.variantName}`} current={r.quantity} />
                        <Link href={qs({ view: "movements", variant: r.variantId })} className="px-2 py-1.5 text-xs text-ink-soft hover:text-espresso">History</Link>
                      </div>
                    </Td>
                  </Tr>
                );
              })}
            </tbody>
          </Table>
          <p className="mt-3 text-xs text-ink-mute">{rows.length} variants</p>
        </>
      ) : (
        <>
          <FilterBar>
            <input type="hidden" name="view" value="movements" />
            {variant && <input type="hidden" name="variant" value={variant} />}
            <Select boxed name="division" defaultValue={division ?? ""} className="w-44" aria-label="Division">
              <option value="">All divisions</option>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.shortName}</option>)}
            </Select>
            <Select boxed name="reason" defaultValue={reason ?? ""} className="w-44" aria-label="Reason">
              <option value="">All reasons</option>
              {["initial", "restock", "adjustment", "sale", "order_cancelled", "return", "damage"].map((r) => (
                <option key={r} value={r}>{r.replace("_", " ")}</option>
              ))}
            </Select>
            {variant && <Link href={qs({ view: "movements" })} className="h-[38px] px-3 text-xs leading-[38px] text-ink-soft hover:text-espresso">Clear variant ✕</Link>}
          </FilterBar>
          <Table>
            <THead>
              <Th>When</Th>
              <Th>Product</Th>
              <Th>SKU</Th>
              <Th>Reason</Th>
              <Th className="text-right">Change</Th>
              <Th className="text-right">After</Th>
              <Th>By / note</Th>
            </THead>
            <tbody>
              {movements.length === 0 && <EmptyRow colSpan={7}>No stock movements recorded.</EmptyRow>}
              {movements.map((m) => (
                <Tr key={m.id}>
                  <Td className="whitespace-nowrap text-xs text-ink-soft">{formatDateTime(m.createdAt)}</Td>
                  <Td>{m.productName}</Td>
                  <Td className="font-mono text-xs">{m.sku}</Td>
                  <Td><StatusBadge status={m.reason} /></Td>
                  <Td className={`text-right tabular-nums ${m.change > 0 ? "text-success" : "text-danger"}`}>{m.change > 0 ? `+${m.change}` : m.change}</Td>
                  <Td className="text-right tabular-nums">{m.quantityAfter}</Td>
                  <Td className="text-xs text-ink-soft">{[m.actor, m.note].filter(Boolean).join(" · ") || "—"}</Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </>
      )}
    </>
  );
}
