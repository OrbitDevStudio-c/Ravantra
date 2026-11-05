"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/primitives";
import { ModalTrigger, Toggle, useAdminAction } from "@/components/admin/client";
import { ImageInput } from "@/components/admin/image-input";
import { saveCategory } from "@/features/admin/product-actions";
import { slugify } from "@/lib/utils";

type Cat = {
  id?: string;
  divisionId: string;
  name: string;
  slug: string;
  description: string;
  image: string;
  sortOrder: number;
  isFeatured: boolean;
  isActive: boolean;
};

export function CategoryEditor({ divisions, initial }: { divisions: { id: string; name: string }[]; initial?: Cat }) {
  return (
    <ModalTrigger label={initial ? "Edit" : "New category"} variant={initial ? "ghost" : "primary"} title={initial ? `Edit ${initial.name}` : "New category"}>
      {(close) => <CategoryForm divisions={divisions} initial={initial} onDone={close} />}
    </ModalTrigger>
  );
}

function CategoryForm({ divisions, initial, onDone }: { divisions: { id: string; name: string }[]; initial?: Cat; onDone: () => void }) {
  const [c, setC] = React.useState<Cat>(
    initial ?? { divisionId: divisions[0]?.id ?? "", name: "", slug: "", description: "", image: "", sortOrder: 10, isFeatured: false, isActive: true },
  );
  const { run, pending } = useAdminAction();
  const set = <K extends keyof Cat>(k: K, v: Cat[K]) => setC((p) => ({ ...p, [k]: v }));

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveCategory(c), { success: "Category saved", onSuccess: onDone });
      }}
    >
      <Field label="Division">
        <Select boxed value={c.divisionId} onChange={(e) => set("divisionId", e.target.value)} disabled={Boolean(initial)}>
          {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Name">
          <Input boxed value={c.name} required onChange={(e) => setC((p) => ({ ...p, name: e.target.value, slug: initial ? p.slug : slugify(e.target.value) }))} />
        </Field>
        <Field label="Slug">
          <Input boxed value={c.slug} required onChange={(e) => set("slug", e.target.value)} />
        </Field>
      </div>
      <Field label="Description">
        <Input boxed value={c.description} onChange={(e) => set("description", e.target.value)} maxLength={240} />
      </Field>
      <ImageInput folder="categories" value={c.image} onChange={(v) => set("image", v)} />
      <div className="grid grid-cols-3 items-end gap-4">
        <Field label="Sort order">
          <Input boxed type="number" value={c.sortOrder} min={0} max={999} onChange={(e) => set("sortOrder", Number(e.target.value))} />
        </Field>
        <label className="flex items-center gap-2 pb-2 text-sm"><Toggle checked={c.isFeatured} onChange={(v) => set("isFeatured", v)} label="Featured" /> Featured</label>
        <label className="flex items-center gap-2 pb-2 text-sm"><Toggle checked={c.isActive} onChange={(v) => set("isActive", v)} label="Active" /> Active</label>
      </div>
      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" loading={pending}>Save category</Button>
      </div>
    </form>
  );
}
