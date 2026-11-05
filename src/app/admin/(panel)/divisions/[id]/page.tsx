import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { canGlobal } from "@/lib/auth/permissions";
import { formatINR } from "@/lib/utils";
import { PageHeader, Panel, StatCard } from "@/components/admin/ui";
import { getAdminDivisions } from "@/features/admin/common";
import { divisionProductCounts, listDivisionManagers } from "@/features/admin/divisions";
import { getDivisionSales, getInventoryByDivision, safe } from "@/features/analytics/queries";
import { DivisionForm, ManagerAssign } from "../division-form";

export const metadata = { title: "Division" };

export default async function DivisionPage({ params }: PageProps<"/admin/divisions/[id]">) {
  const access = await requirePermission("divisions.manage");
  if (!canGlobal(access, "divisions.manage")) redirect("/admin?denied=divisions.manage");
  const { id } = await params;
  const divisions = await getAdminDivisions();
  const d = divisions.find((x) => x.id === id);
  if (!d) notFound();
  const [managers, sales, inventory, counts] = await Promise.all([listDivisionManagers(id), safe(getDivisionSales(365), []), safe(getInventoryByDivision(), []), divisionProductCounts()]);
  const s = sales.find((x) => x.divisionId === id);
  const inv = inventory.find((x) => x.divisionId === id);

  return (
    <>
      <PageHeader
        back={{ href: "/admin/divisions", label: "Divisions" }}
        eyebrow={`/${d.slug}`}
        title={d.name}
        actions={
          <Link href={d.kind === "services" ? "/salon-spa" : `/${d.slug}`} target="_blank" className="text-xs uppercase tracking-[0.14em] text-ink-soft hover:text-espresso">
            View storefront ↗
          </Link>
        }
      />
      {d.kind === "products" && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <StatCard label="Revenue · 12 months" value={formatINR(s?.revenue ?? 0)} />
          <StatCard label="Orders · 12 months" value={String(s?.orders ?? 0)} />
          <StatCard label="Units sold" value={String(s?.units ?? 0)} />
          <StatCard label="Stock on hand" value={String(inv?.units ?? 0)} hint={`${counts[id] ?? 0} products`} />
        </div>
      )}
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <DivisionForm
            initial={{
              id: d.id,
              name: d.name,
              shortName: d.shortName,
              slug: d.slug,
              tagline: d.tagline,
              description: d.description,
              kind: d.kind,
              accentColor: d.accentColor,
              heroImage: d.heroImage,
              bannerImage: d.bannerImage,
              logoUrl: d.logoUrl ?? "",
              sortOrder: d.sortOrder,
              isActive: d.isActive,
            }}
          />
        </div>
        <Panel title="Managers">
          <ManagerAssign divisionId={d.id} managers={managers} />
        </Panel>
      </div>
    </>
  );
}
