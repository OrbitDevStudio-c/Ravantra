"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Toggle, useAdminAction } from "@/components/admin/client";
import { ImageInput } from "@/components/admin/image-input";
import { assignManager, removeManager, saveDivision } from "@/features/admin/division-actions";
import { slugify } from "@/lib/utils";

export type DivisionFormValues = {
  id?: string;
  name: string;
  shortName: string;
  slug: string;
  tagline: string;
  description: string;
  kind: "products" | "services";
  accentColor: string;
  heroImage: string;
  bannerImage: string;
  logoUrl: string;
  sortOrder: number;
  isActive: boolean;
};

export function DivisionForm({ initial }: { initial: DivisionFormValues }) {
  const router = useRouter();
  const [d, setD] = React.useState(initial);
  const [saving, start] = React.useTransition();
  const set = <K extends keyof DivisionFormValues>(k: K, v: DivisionFormValues[K]) => setD((x) => ({ ...x, [k]: v }));
  const isNew = !initial.id;

  return (
    <form
      className="space-y-5 border border-line bg-white p-6"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => {
          const res = await saveDivision(d);
          if (res.ok) {
            toast.success(isNew ? "Division created" : "Division saved");
            if (isNew && res.data) router.replace(`/admin/divisions/${res.data.id}`);
            else router.refresh();
          } else toast.error(res.error);
        });
      }}
    >
      <div className="grid gap-5 md:grid-cols-2">
        <Field label="Full name">
          <Input boxed required value={d.name} onChange={(e) => setD((x) => ({ ...x, name: e.target.value }))} placeholder="RAVANTRA Home" />
        </Field>
        <Field label="Short name" hint="Used in navigation">
          <Input boxed required value={d.shortName} onChange={(e) => setD((x) => ({ ...x, shortName: e.target.value, slug: isNew ? slugify(e.target.value) : x.slug }))} />
        </Field>
        <Field label="URL slug" hint={`ravantra.in/${d.slug || "slug"}`}>
          <Input boxed required value={d.slug} onChange={(e) => set("slug", e.target.value)} disabled={!isNew} />
        </Field>
        <Field label="Type">
          <Select boxed value={d.kind} onChange={(e) => set("kind", e.target.value as DivisionFormValues["kind"])} disabled={!isNew}>
            <option value="products">Products (shippable catalogue)</option>
            <option value="services">Services (appointments)</option>
          </Select>
        </Field>
        <Field label="Tagline" className="md:col-span-2">
          <Input boxed value={d.tagline} onChange={(e) => set("tagline", e.target.value)} />
        </Field>
        <Field label="Description" className="md:col-span-2">
          <Textarea boxed rows={3} value={d.description} onChange={(e) => set("description", e.target.value)} />
        </Field>
        <Field label="Accent colour">
          <div className="flex gap-2">
            <input type="color" value={d.accentColor} onChange={(e) => set("accentColor", e.target.value.toUpperCase())} className="h-10 w-12 cursor-pointer border border-line" aria-label="Pick accent colour" />
            <Input boxed value={d.accentColor} onChange={(e) => set("accentColor", e.target.value)} />
          </div>
        </Field>
        <Field label="Sort order">
          <Input boxed type="number" min={0} max={999} value={d.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} />
        </Field>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <ImageInput folder="divisions" label="Hero image" value={d.heroImage} onChange={(v) => set("heroImage", v)} />
        <ImageInput folder="divisions" label="Banner image" value={d.bannerImage} onChange={(v) => set("bannerImage", v)} />
        <ImageInput folder="divisions" label="Logo" value={d.logoUrl} onChange={(v) => set("logoUrl", v)} />
      </div>
      <div className="flex items-center justify-between border-t border-line pt-5">
        <label className="flex items-center gap-2 text-sm"><Toggle checked={d.isActive} onChange={(v) => set("isActive", v)} label="Active" /> Visible on the storefront</label>
        <Button type="submit" loading={saving}>{isNew ? "Create division" : "Save division"}</Button>
      </div>
    </form>
  );
}

export function ManagerAssign({ divisionId, managers }: { divisionId: string; managers: { userId: string; name: string; email: string; title: string }[] }) {
  const [email, setEmail] = React.useState("");
  const { run, pending } = useAdminAction();
  return (
    <div>
      <ul className="divide-y divide-line">
        {managers.length === 0 && <li className="py-3 text-sm text-ink-mute">No managers assigned yet.</li>}
        {managers.map((m) => (
          <li key={m.userId} className="flex items-center justify-between gap-3 py-3 text-sm">
            <div>
              <p>{m.name || m.email}</p>
              <p className="text-xs text-ink-mute">{m.email} · {m.title}</p>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="text-danger"
              loading={pending}
              onClick={() => window.confirm(`Remove ${m.name || m.email} as manager? Their division role is revoked.`) && run(() => removeManager(divisionId, m.userId), { success: "Manager removed" })}
            >
              Remove
            </Button>
          </li>
        ))}
      </ul>
      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(() => assignManager(divisionId, email), { success: "Manager assigned", onSuccess: () => setEmail("") });
        }}
      >
        <Input boxed type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="manager@email.com" className="flex-1" aria-label="Manager email" />
        <Button type="submit" size="sm" loading={pending}>Assign</Button>
      </form>
      <p className="mt-2 text-xs text-ink-mute">The person must already have a RAVANTRA account. They receive this division&apos;s scoped manager role.</p>
    </div>
  );
}
