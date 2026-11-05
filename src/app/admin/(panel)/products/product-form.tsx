"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useFieldArray, useForm, type FieldErrors } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { Toggle, useAdminAction } from "@/components/admin/client";
import { ImageInput } from "@/components/admin/image-input";
import { productFormSchema, type ProductFormValues } from "@/features/admin/product-schema";
import { deleteProduct, saveProduct } from "@/features/admin/product-actions";
import { slugify } from "@/lib/utils";

type Option = { id: string; name: string; divisionId?: string };

export function ProductForm({
  initial,
  divisions,
  categories,
  canSetStock,
}: {
  initial: ProductFormValues;
  divisions: Option[];
  categories: Option[];
  canSetStock: boolean;
}) {
  const router = useRouter();
  const isNew = !initial.id;
  const [saving, startSave] = React.useTransition();
  const { run: runDelete, pending: deleting } = useAdminAction();
  const form = useForm<ProductFormValues>({ resolver: zodResolver(productFormSchema), defaultValues: initial, mode: "onBlur" });
  const { register, handleSubmit, watch, setValue, control, formState, setError } = form;
  const errors = formState.errors;
  const images = useFieldArray({ control, name: "images" });
  const variants = useFieldArray({ control, name: "variants" });
  const divisionId = watch("divisionId");
  const sku = watch("sku");
  const divisionCategories = categories.filter((c) => c.divisionId === divisionId);

  const onSubmit = (values: ProductFormValues) =>
    startSave(async () => {
      const res = await saveProduct(values);
      if (res.ok) {
        toast.success(isNew ? "Product created" : "Product saved");
        if (isNew && res.data) router.replace(`/admin/products/${res.data.id}`);
        else router.refresh();
      } else {
        toast.error(res.error);
        Object.entries(res.fieldErrors ?? {}).forEach(([k, msgs]) => msgs?.[0] && setError(k as keyof ProductFormValues, { message: msgs[0] }));
      }
    });

  const onInvalid = (e: FieldErrors<ProductFormValues>) => {
    toast.error("Please fix the highlighted fields.");
    console.warn(e);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit, onInvalid)} className="grid gap-6 xl:grid-cols-3" noValidate>
      <div className="space-y-6 xl:col-span-2">
        <Section title="Details">
          <div className="grid gap-5 md:grid-cols-2">
            <Field label="Product name" error={errors.name?.message} className="md:col-span-2">
              <Input
                boxed
                {...register("name", {
                  onChange: (e) => {
                    if (isNew) setValue("slug", slugify(e.target.value));
                  },
                })}
              />
            </Field>
            <Field label="URL slug" error={errors.slug?.message} hint="/products/your-slug">
              <Input boxed {...register("slug")} />
            </Field>
            <Field label="Base SKU" error={errors.sku?.message}>
              <Input boxed {...register("sku")} className="uppercase" />
            </Field>
            <Field label="Short description" error={errors.shortDescription?.message} className="md:col-span-2">
              <Input boxed {...register("shortDescription")} maxLength={240} />
            </Field>
            <Field label="Description" error={errors.description?.message} className="md:col-span-2">
              <Textarea boxed rows={5} {...register("description")} />
            </Field>
            <Field label="Highlights" hint="One per line" error={errors.highlights?.message}>
              <Textarea boxed rows={4} {...register("highlights")} />
            </Field>
            <Field label="Ingredients / composition" hint="Shown on beauty & fragrance products" error={errors.ingredients?.message}>
              <Textarea boxed rows={4} {...register("ingredients")} />
            </Field>
            <Field label="Tags" hint="Comma separated — used by search" error={errors.tags?.message} className="md:col-span-2">
              <Input boxed {...register("tags")} />
            </Field>
          </div>
        </Section>

        <Section
          title={`Images (${images.fields.length})`}
          action={
            <Button type="button" size="sm" variant="outline" onClick={() => images.append({ url: "", alt: "" })} disabled={images.fields.length >= 12}>
              <Plus /> Add image
            </Button>
          }
        >
          {images.fields.length === 0 && <p className="text-sm text-ink-mute">No images yet. The first image is used on product cards.</p>}
          <ul className="space-y-4">
            {images.fields.map((f, i) => (
              <li key={f.id} className="flex items-start gap-3 border-b border-line pb-4 last:border-0">
                <span className="mt-6 w-5 text-xs tabular-nums text-ink-mute">{i + 1}</span>
                <div className="min-w-0 flex-1 space-y-2">
                  <ImageInput folder="products" value={watch(`images.${i}.url`)} onChange={(url) => setValue(`images.${i}.url`, url, { shouldDirty: true, shouldValidate: true })} label={i === 0 ? "Cover image" : `Image ${i + 1}`} />
                  <Input boxed {...register(`images.${i}.alt`)} placeholder="Alt text (describe the image)" className="text-xs" />
                  {errors.images?.[i]?.url && <p className="text-xs text-danger">{errors.images[i]?.url?.message}</p>}
                </div>
                <div className="mt-5 flex flex-col gap-1">
                  <IconBtn label="Move up" disabled={i === 0} onClick={() => images.move(i, i - 1)}><ArrowUp className="size-3.5" /></IconBtn>
                  <IconBtn label="Move down" disabled={i === images.fields.length - 1} onClick={() => images.move(i, i + 1)}><ArrowDown className="size-3.5" /></IconBtn>
                  <IconBtn label="Remove image" onClick={() => images.remove(i)}><Trash2 className="size-3.5" /></IconBtn>
                </div>
              </li>
            ))}
          </ul>
        </Section>

        <Section
          title={`Variants (${variants.fields.length})`}
          action={
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() =>
                variants.append({ sku: `${(sku || "SKU").toUpperCase()}-${String(variants.fields.length + 1).padStart(2, "0")}`, size: "", color: "", colorHex: "", volume: "", price: "", salePrice: "", isActive: true, openingStock: "" })
              }
            >
              <Plus /> Add variant
            </Button>
          }
        >
          {errors.variants?.message && <p className="mb-3 text-sm text-danger">{errors.variants.message}</p>}
          <p className="mb-4 text-xs text-ink-mute">
            Leave price empty to use the product price. Stock for existing variants is managed in Inventory{canSetStock ? "; new variants accept opening stock." : "."}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-left text-xs">
              <thead className="text-[0.6rem] uppercase tracking-[0.12em] text-ink-mute">
                <tr>
                  {["SKU", "Size", "Colour", "Hex", "Volume", "Price", "Sale", ...(canSetStock ? ["Opening stock"] : []), "Active", ""].map((h) => (
                    <th key={h} className="pb-2 pr-2 font-medium">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {variants.fields.map((f, i) => {
                  const e = errors.variants?.[i];
                  const isExisting = Boolean(watch(`variants.${i}.id`));
                  return (
                    <tr key={f.id} className="align-top">
                      <td className="py-1 pr-2"><Input boxed {...register(`variants.${i}.sku`)} className="w-36 uppercase" aria-invalid={Boolean(e?.sku)} />{e?.sku && <p className="mt-0.5 text-danger">{e.sku.message}</p>}</td>
                      <td className="py-1 pr-2"><Input boxed {...register(`variants.${i}.size`)} className="w-20" placeholder="M" /></td>
                      <td className="py-1 pr-2"><Input boxed {...register(`variants.${i}.color`)} className="w-28" /></td>
                      <td className="py-1 pr-2">
                        <div className="flex items-center gap-1">
                          <input type="color" value={watch(`variants.${i}.colorHex`) || "#ffffff"} onChange={(ev) => setValue(`variants.${i}.colorHex`, ev.target.value.toUpperCase())} className="size-8 cursor-pointer border border-line" aria-label="Pick colour" />
                          <Input boxed {...register(`variants.${i}.colorHex`)} className="w-24" placeholder="#RRGGBB" />
                        </div>
                        {e?.colorHex && <p className="mt-0.5 text-danger">{e.colorHex.message}</p>}
                      </td>
                      <td className="py-1 pr-2"><Input boxed {...register(`variants.${i}.volume`)} className="w-20" placeholder="50 ml" /></td>
                      <td className="py-1 pr-2"><Input boxed {...register(`variants.${i}.price`)} className="w-24" inputMode="decimal" /></td>
                      <td className="py-1 pr-2"><Input boxed {...register(`variants.${i}.salePrice`)} className="w-24" inputMode="decimal" /></td>
                      {canSetStock && (
                        <td className="py-1 pr-2">
                          {isExisting ? <span className="block py-2 text-ink-mute">Inventory</span> : <Input boxed {...register(`variants.${i}.openingStock`)} className="w-20" inputMode="numeric" placeholder="0" />}
                        </td>
                      )}
                      <td className="py-2.5 pr-2"><Toggle checked={watch(`variants.${i}.isActive`)} onChange={(val) => setValue(`variants.${i}.isActive`, val)} label="Variant active" /></td>
                      <td className="py-1">
                        <IconBtn label="Remove variant" disabled={variants.fields.length === 1} onClick={() => variants.remove(i)}><Trash2 className="size-3.5" /></IconBtn>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Section>
      </div>

      <div className="space-y-6">
        <Section title="Organisation">
          <div className="space-y-5">
            <Field label="Division" error={errors.divisionId?.message}>
              <Select
                boxed
                {...register("divisionId", {
                  onChange: () => setValue("categoryId", ""),
                })}
              >
                <option value="">Choose…</option>
                {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label="Category" error={errors.categoryId?.message}>
              <Select boxed {...register("categoryId")} disabled={!divisionId}>
                <option value="">Choose…</option>
                {divisionCategories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
          </div>
        </Section>
        <Section title="Pricing (INR)">
          <div className="grid grid-cols-2 gap-4">
            <Field label="Price" error={errors.price?.message}>
              <Input boxed {...register("price")} inputMode="decimal" />
            </Field>
            <Field label="Sale price" error={errors.salePrice?.message} hint="Optional">
              <Input boxed {...register("salePrice")} inputMode="decimal" />
            </Field>
          </div>
        </Section>
        <Section title="Visibility">
          <div className="space-y-4 text-sm">
            {(
              [
                ["isActive", "Active", "Visible on the storefront"],
                ["isFeatured", "Featured", "Shown in curated edits on the homepage"],
                ["isNew", "New arrival", "Shows a “New” badge"],
              ] as const
            ).map(([key, label, hint]) => (
              <label key={key} className="flex items-start justify-between gap-4">
                <span>
                  {label}
                  <span className="block text-xs text-ink-mute">{hint}</span>
                </span>
                <Toggle checked={watch(key)} onChange={(v) => setValue(key, v, { shouldDirty: true })} label={label} />
              </label>
            ))}
          </div>
        </Section>
        <div className="sticky top-20 space-y-2">
          <Button type="submit" className="w-full" loading={saving}>{isNew ? "Create product" : "Save changes"}</Button>
          {!isNew && (
            <Button
              type="button"
              variant="ghost"
              className="w-full text-danger"
              loading={deleting}
              onClick={() => {
                if (!window.confirm("Delete this product permanently? Products with orders can only be deactivated.")) return;
                runDelete(() => deleteProduct(initial.id!), { success: "Product deleted", onSuccess: () => router.replace("/admin/products") });
              }}
            >
              Delete product
            </Button>
          )}
        </div>
      </div>
    </form>
  );
}

function Section({ title, action, children }: { title: string; action?: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="border border-line bg-white">
      <header className="flex items-center justify-between border-b border-line px-5 py-3">
        <h2 className="font-serif text-lg">{title}</h2>
        {action}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

function IconBtn({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="grid size-7 place-items-center border border-line bg-white text-ink-soft hover:border-espresso hover:text-espresso disabled:opacity-30">
      {children}
    </button>
  );
}
