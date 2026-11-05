import Image from "next/image";
import { requirePermission } from "@/lib/auth/session";
import { formatDate, formatINR } from "@/lib/utils";
import { DemoBadge, EmptyRow, PageHeader, StatusBadge, Table, Tabs, Td, Th, THead, Tr } from "@/components/admin/ui";
import { ActionButton, ActionToggle } from "@/components/admin/client";
import { Badge } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { listCoupons, listPromotions, listSubscribers } from "@/features/admin/marketing";
import { deletePromotion, setCategoryFeatured, setCouponActive, setProductFeatured, setSubscriberActive } from "@/features/admin/marketing-actions";
import { listAdminProducts } from "@/features/admin/products";
import { divisionName, getAdminCategories, getAdminDivisions, str } from "@/features/admin/common";
import { CouponEditor, PromotionEditor } from "./editors";

export const metadata = { title: "Marketing" };

function isLive(p: { isActive: boolean; startsAt: string | null; endsAt: string | null }) {
  const now = Date.now();
  return p.isActive && (!p.startsAt || +new Date(p.startsAt) <= now) && (!p.endsAt || +new Date(p.endsAt) > now);
}

const TABS = ["campaigns", "coupons", "featured", "newsletter"] as const;

export default async function MarketingPage({ searchParams }: PageProps<"/admin/marketing">) {
  await requirePermission("marketing.manage");
  const sp = await searchParams;
  const tab = TABS.find((t) => t === str(sp.tab)) ?? "campaigns";
  const divisions = await getAdminDivisions();
  const divOpts = divisions.map((d) => ({ id: d.id, name: d.shortName }));

  return (
    <>
      <PageHeader title="Marketing" description="Campaign banners, discount codes, curated featured edits and newsletter subscribers." />
      <Tabs
        active={tab}
        tabs={[
          { key: "campaigns", label: "Campaigns", href: "/admin/marketing" },
          { key: "coupons", label: "Coupons", href: "/admin/marketing?tab=coupons" },
          { key: "featured", label: "Featured", href: "/admin/marketing?tab=featured" },
          { key: "newsletter", label: "Newsletter", href: "/admin/marketing?tab=newsletter" },
        ]}
      />
      {tab === "campaigns" && <Campaigns divOpts={divOpts} />}
      {tab === "coupons" && <Coupons divOpts={divOpts} divisions={divisions} />}
      {tab === "featured" && <Featured divisions={divisions} />}
      {tab === "newsletter" && <Newsletter />}
    </>
  );
}

async function Campaigns({ divOpts }: { divOpts: { id: string; name: string }[] }) {
  const promos = await listPromotions();
  return (
    <>
      <div className="mb-4 flex justify-end"><PromotionEditor divisions={divOpts} /></div>
      <div className="grid gap-4 md:grid-cols-2">
        {promos.length === 0 && <p className="text-sm text-ink-mute">No campaigns yet.</p>}
        {promos.map((p) => {
          const live = isLive(p);
          return (
            <article key={p.id} className="flex border border-line bg-white">
              <div className="relative w-36 shrink-0 bg-champagne">
                {p.image && <Image src={p.image} alt="" fill sizes="144px" className="object-cover" quality={60} />}
              </div>
              <div className="flex min-w-0 flex-1 flex-col p-4">
                <div className="flex items-center gap-2">
                  <Badge tone={live ? "success" : "outline"}>{live ? "Live" : p.isActive ? "Scheduled" : "Off"}</Badge>
                  <span className="text-[0.65rem] uppercase tracking-[0.12em] text-ink-mute">{p.placement.replace("_", " ")}</span>
                </div>
                <p className="eyebrow mt-3 text-[0.6rem] text-mocha">{p.eyebrow}</p>
                <h3 className="font-serif text-xl leading-tight">{p.title}</h3>
                <p className="mt-1 line-clamp-2 text-xs text-ink-soft">{p.subtitle}</p>
                <p className="mt-2 text-xs text-ink-mute">
                  {p.startsAt ? formatDate(p.startsAt) : "Always"} → {p.endsAt ? formatDate(p.endsAt) : "No end"} · {p.ctaLabel} → <code>{p.ctaHref}</code>
                </p>
                <div className="mt-auto flex justify-end gap-1 pt-3">
                  <PromotionEditor
                    divisions={divOpts}
                    initial={{
                      id: p.id,
                      eyebrow: p.eyebrow,
                      title: p.title,
                      subtitle: p.subtitle,
                      ctaLabel: p.ctaLabel,
                      ctaHref: p.ctaHref,
                      image: p.image,
                      placement: p.placement,
                      divisionId: p.divisionId ?? "",
                      startsAt: p.startsAt ? p.startsAt.slice(0, 10) : "",
                      endsAt: p.endsAt ? p.endsAt.slice(0, 10) : "",
                      isActive: p.isActive,
                      sortOrder: p.sortOrder,
                    }}
                  />
                  <ActionButton size="sm" variant="ghost" className="text-danger" action={deletePromotion.bind(null, p.id)} confirm={`Delete “${p.title}”?`} success="Campaign deleted">
                    Delete
                  </ActionButton>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}

async function Coupons({ divOpts, divisions }: { divOpts: { id: string; name: string }[]; divisions: Awaited<ReturnType<typeof getAdminDivisions>> }) {
  const coupons = await listCoupons();
  return (
    <>
      <div className="mb-4 flex justify-end"><CouponEditor divisions={divOpts} /></div>
      <Table>
        <THead>
          <Th>Code</Th>
          <Th>Offer</Th>
          <Th>Applies to</Th>
          <Th className="text-right">Min. order</Th>
          <Th>Validity</Th>
          <Th className="text-right">Used</Th>
          <Th>Active</Th>
          <Th className="text-right">Edit</Th>
        </THead>
        <tbody>
          {coupons.length === 0 && <EmptyRow colSpan={8}>No coupons yet.</EmptyRow>}
          {coupons.map((c) => (
            <Tr key={c.id}>
              <Td><code className="bg-ivory-2 px-1.5 py-0.5 font-mono text-xs">{c.code}</code></Td>
              <Td>
                <p>{c.discountType === "percent" ? `${c.discountValue}% off` : `${formatINR(c.discountValue)} off`}{c.maxDiscount ? ` (max ${formatINR(c.maxDiscount)})` : ""}</p>
                <p className="text-xs text-ink-mute">{c.description}</p>
              </Td>
              <Td className="text-xs text-ink-soft">{c.divisionId ? divisionName(divisions, c.divisionId) : "All divisions"}</Td>
              <Td className="text-right tabular-nums">{formatINR(c.minSubtotal)}</Td>
              <Td className="text-xs text-ink-soft">{c.startsAt ? formatDate(c.startsAt) : "Now"} → {c.endsAt ? formatDate(c.endsAt) : "No end"}</Td>
              <Td className="text-right tabular-nums">{c.usedCount}{c.usageLimit ? ` / ${c.usageLimit}` : ""}</Td>
              <Td><ActionToggle checked={c.isActive} label={`Activate ${c.code}`} action={setCouponActive.bind(null, c.id)} /></Td>
              <Td className="text-right">
                <CouponEditor
                  divisions={divOpts}
                  initial={{
                    id: c.id,
                    code: c.code,
                    description: c.description,
                    discountType: c.discountType,
                    discountValue: c.discountValue,
                    minSubtotal: c.minSubtotal,
                    maxDiscount: c.maxDiscount,
                    divisionId: c.divisionId ?? "",
                    startsAt: c.startsAt ? c.startsAt.slice(0, 10) : "",
                    endsAt: c.endsAt ? c.endsAt.slice(0, 10) : "",
                    usageLimit: c.usageLimit,
                    isActive: c.isActive,
                  }}
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}

async function Featured({ divisions }: { divisions: Awaited<ReturnType<typeof getAdminDivisions>> }) {
  const [products, categories] = await Promise.all([listAdminProducts({ status: "active" }), getAdminCategories()]);
  return (
    <div className="grid gap-6 xl:grid-cols-3">
      <div className="xl:col-span-2">
        <h2 className="mb-1 font-serif text-xl">Featured products</h2>
        <p className="mb-3 text-xs text-ink-mute">Featured products appear in the homepage “Curated edit”, interleaved across divisions.</p>
        <Table>
          <THead>
            <Th>Product</Th>
            <Th>Division</Th>
            <Th>Featured</Th>
          </THead>
          <tbody>
            {products.map((p) => (
              <Tr key={p.id}>
                <Td>
                  <div className="flex items-center gap-3">
                    <div className="relative h-10 w-8 shrink-0 overflow-hidden bg-champagne">
                      {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="32px" className="object-cover" quality={60} />}
                    </div>
                    {p.name}
                  </div>
                </Td>
                <Td className="text-xs text-ink-soft">{divisionName(divisions, p.divisionId)}</Td>
                <Td><ActionToggle checked={p.isFeatured} label={`Feature ${p.name}`} action={setProductFeatured.bind(null, p.id)} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
      <div>
        <h2 className="mb-1 font-serif text-xl">Featured categories</h2>
        <p className="mb-3 text-xs text-ink-mute">Highlighted on division landing pages.</p>
        <Table className="[&_table]:min-w-0">
          <THead>
            <Th>Category</Th>
            <Th>Featured</Th>
          </THead>
          <tbody>
            {categories.map((c) => (
              <Tr key={c.id}>
                <Td>
                  {c.name}
                  <span className="block text-xs text-ink-mute">{divisionName(divisions, c.divisionId)}</span>
                </Td>
                <Td><ActionToggle checked={c.isFeatured} label={`Feature ${c.name}`} action={setCategoryFeatured.bind(null, c.id)} /></Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

async function Newsletter() {
  const subs = await listSubscribers();
  const active = subs.filter((s) => s.isActive).length;
  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-soft">{active} active of {subs.length} subscribers</p>
        <Button variant="outline" size="sm" asChild>
          <a href="/admin/marketing/export" download>Export CSV</a>
        </Button>
      </div>
      <Table>
        <THead>
          <Th>Email</Th>
          <Th>Source</Th>
          <Th>Subscribed</Th>
          <Th>Status</Th>
          <Th>Active</Th>
        </THead>
        <tbody>
          {subs.length === 0 && <EmptyRow colSpan={5}>No subscribers yet.</EmptyRow>}
          {subs.map((s) => (
            <Tr key={s.id}>
              <Td>{s.email}{s.isDemo && <DemoBadge />}</Td>
              <Td className="text-xs text-ink-soft">{s.source}</Td>
              <Td className="text-xs text-ink-soft">{formatDate(s.createdAt)}</Td>
              <Td><StatusBadge status={s.isActive ? "active" : "inactive"} /></Td>
              <Td><ActionToggle checked={s.isActive} label={`Subscription for ${s.email}`} action={setSubscriberActive.bind(null, s.id)} /></Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
