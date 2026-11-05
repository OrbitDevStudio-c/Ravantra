"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ModalTrigger, Toggle, useAdminAction } from "@/components/admin/client";
import { ImageInput } from "@/components/admin/image-input";
import { saveService } from "@/features/admin/salon-actions";
import { slugify } from "@/lib/utils";

type Svc = {
  id?: string;
  divisionId: string;
  slug: string;
  category: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  image: string;
  isPopular: boolean;
  isActive: boolean;
};

const CATEGORIES = ["Hair", "Skin", "Bridal", "Spa", "Nails"];

export function ServiceEditor({ divisions, initial }: { divisions: { id: string; name: string }[]; initial?: Svc }) {
  return (
    <ModalTrigger label={initial ? "Edit" : "New service"} variant={initial ? "ghost" : "primary"} title={initial ? `Edit ${initial.name}` : "New service"} wide>
      {(close) => <ServiceForm divisions={divisions} initial={initial} onDone={close} />}
    </ModalTrigger>
  );
}

function ServiceForm({ divisions, initial, onDone }: { divisions: { id: string; name: string }[]; initial?: Svc; onDone: () => void }) {
  const [s, setS] = React.useState<Svc>(
    initial ?? { divisionId: divisions[0]?.id ?? "", slug: "", category: "Hair", name: "", description: "", durationMin: 60, price: 1500, image: "", isPopular: false, isActive: true },
  );
  const set = <K extends keyof Svc>(k: K, v: Svc[K]) => setS((p) => ({ ...p, [k]: v }));
  const { run, pending } = useAdminAction();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveService(s), { success: "Service saved", onSuccess: onDone });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input boxed required value={s.name} onChange={(e) => setS((p) => ({ ...p, name: e.target.value, slug: initial ? p.slug : slugify(e.target.value) }))} />
        </Field>
        <Field label="Slug">
          <Input boxed required value={s.slug} onChange={(e) => set("slug", e.target.value)} />
        </Field>
        <Field label="Category">
          <Input boxed list="svc-cats" required value={s.category} onChange={(e) => set("category", e.target.value)} />
          <datalist id="svc-cats">{CATEGORIES.map((c) => <option key={c} value={c} />)}</datalist>
        </Field>
        {divisions.length > 1 && (
          <Field label="Division">
            <Select boxed value={s.divisionId} onChange={(e) => set("divisionId", e.target.value)}>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Duration (minutes)" hint="Multiple of 15">
          <Input boxed type="number" min={15} max={480} step={15} value={s.durationMin} onChange={(e) => set("durationMin", Number(e.target.value))} />
        </Field>
        <Field label="Price (₹)">
          <Input boxed type="number" min={0} step={50} value={s.price} onChange={(e) => set("price", Number(e.target.value))} />
        </Field>
      </div>
      <Field label="Description">
        <Textarea boxed rows={3} value={s.description} onChange={(e) => set("description", e.target.value)} maxLength={1000} />
      </Field>
      <ImageInput folder="salon" value={s.image} onChange={(v) => set("image", v)} />
      <div className="flex gap-6 text-sm">
        <label className="flex items-center gap-2"><Toggle checked={s.isPopular} onChange={(v) => set("isPopular", v)} label="Popular" /> Show on homepage</label>
        <label className="flex items-center gap-2"><Toggle checked={s.isActive} onChange={(v) => set("isActive", v)} label="Active" /> Bookable</label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" loading={pending}>Save service</Button>
      </div>
    </form>
  );
}
