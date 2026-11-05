import Image from "next/image";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { canGlobal } from "@/lib/auth/permissions";
import { redirect } from "next/navigation";
import { formatINR } from "@/lib/utils";
import { Denied, PageHeader } from "@/components/admin/ui";
import { ActionToggle } from "@/components/admin/client";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { getAdminDivisions } from "@/features/admin/common";
import { divisionProductCounts, listDivisionManagers } from "@/features/admin/divisions";
import { setDivisionActive } from "@/features/admin/division-actions";
import { getDivisionSales, getOverview, safe } from "@/features/analytics/queries";

export const metadata = { title: "Divisions" };

export default async function DivisionsPage() {
  const access = await requirePermission("divisions.manage");
  if (!canGlobal(access, "divisions.manage")) redirect("/admin?denied=divisions.manage");
  const [divisions, sales, managers, counts, overview] = await Promise.all([
    getAdminDivisions(),
    safe(getDivisionSales(90), []),
    listDivisionManagers(),
    divisionProductCounts(),
    safe(getOverview(90), null),
  ]);

  return (
    <>
      <PageHeader
        title="Business divisions"
        description="RAVANTRA's operating divisions. Adding a division creates its storefront section, a scoped manager role and reporting — no rebuild needed."
        actions={<Button size="sm" asChild><Link href="/admin/divisions/new">Add division</Link></Button>}
      />
      {!divisions.length && <Denied perm="divisions.manage" />}
      <div className="grid gap-5 lg:grid-cols-2">
        {divisions.map((d) => {
          const s = sales.find((x) => x.divisionId === d.id);
          const mgrs = managers.filter((m) => m.divisionId === d.id);
          return (
            <article key={d.id} className="overflow-hidden border border-line bg-white">
              <div className="relative h-36 bg-champagne">
                {(d.bannerImage || d.heroImage) && <Image src={d.bannerImage || d.heroImage} alt="" fill sizes="(min-width:1024px) 40vw, 90vw" className="object-cover" quality={60} />}
                <div className="absolute inset-0 bg-gradient-to-t from-espresso/70 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 flex items-end justify-between text-ivory">
                  <div>
                    <p className="text-[0.6rem] uppercase tracking-[0.2em] text-ivory/70">/{d.slug} · {d.kind}</p>
                    <h2 className="font-serif text-2xl">{d.name}</h2>
                  </div>
                  <span className="size-4 rounded-full border border-ivory/60" style={{ background: d.accentColor }} aria-label={`Accent ${d.accentColor}`} />
                </div>
              </div>
              <div className="grid grid-cols-3 divide-x divide-line border-b border-line text-center">
                <div className="p-3">
                  <p className="text-[0.6rem] uppercase tracking-[0.14em] text-ink-mute">{d.kind === "services" ? "Appt. revenue" : "Revenue · 90d"}</p>
                  <p className="mt-1 font-serif text-lg tabular-nums">{d.kind === "services" ? formatINR(overview?.appointmentRevenue ?? 0) : formatINR(s?.revenue ?? 0)}</p>
                </div>
                <div className="p-3">
                  <p className="text-[0.6rem] uppercase tracking-[0.14em] text-ink-mute">{d.kind === "services" ? "Upcoming" : "Orders · 90d"}</p>
                  <p className="mt-1 font-serif text-lg tabular-nums">{d.kind === "services" ? overview?.appointmentsUpcoming ?? 0 : s?.orders ?? 0}</p>
                </div>
                <div className="p-3">
                  <p className="text-[0.6rem] uppercase tracking-[0.14em] text-ink-mute">{d.kind === "services" ? "Services" : "Products"}</p>
                  <p className="mt-1 font-serif text-lg tabular-nums">{counts[d.id] ?? 0}</p>
                </div>
              </div>
              <div className="flex items-center justify-between gap-3 p-4">
                <div className="min-w-0 text-xs text-ink-soft">
                  <p className="eyebrow mb-1 text-[0.58rem] text-ink-mute">Managers</p>
                  {mgrs.length ? mgrs.map((m) => m.name || m.email).join(", ") : <span className="text-ink-mute">None assigned</span>}
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <label className="flex items-center gap-2 text-xs">
                    <ActionToggle checked={d.isActive} label={`${d.isActive ? "Deactivate" : "Activate"} ${d.name}`} action={setDivisionActive.bind(null, d.id)} />
                    {d.isActive ? <Badge tone="success">Live</Badge> : <Badge tone="outline">Hidden</Badge>}
                  </label>
                  <Button variant="outline" size="sm" asChild><Link href={`/admin/divisions/${d.id}`}>Manage</Link></Button>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
