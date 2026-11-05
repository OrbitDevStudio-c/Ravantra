"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/primitives";
import { ModalTrigger, Toggle, useAdminAction } from "@/components/admin/client";
import { ImageInput } from "@/components/admin/image-input";
import { saveCoupon, savePromotion } from "@/features/admin/marketing-actions";

type Promo = {
  id?: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  placement: "home_banner" | "home_strip" | "division_banner";
  divisionId: string;
  startsAt: string;
  endsAt: string;
  isActive: boolean;
  sortOrder: number;
};

export function PromotionEditor({ divisions, initial }: { divisions: { id: string; name: string }[]; initial?: Promo }) {
  return (
    <ModalTrigger label={initial ? "Edit" : "New campaign"} variant={initial ? "ghost" : "primary"} title={initial ? "Edit campaign" : "New campaign"} wide>
      {(close) => <PromoForm divisions={divisions} initial={initial} onDone={close} />}
    </ModalTrigger>
  );
}

function PromoForm({ divisions, initial, onDone }: { divisions: { id: string; name: string }[]; initial?: Promo; onDone: () => void }) {
  const [p, setP] = React.useState<Promo>(
    initial ?? { eyebrow: "", title: "", subtitle: "", ctaLabel: "Shop now", ctaHref: "/products", image: "", placement: "home_banner", divisionId: "", startsAt: "", endsAt: "", isActive: true, sortOrder: 10 },
  );
  const set = <K extends keyof Promo>(k: K, v: Promo[K]) => setP((x) => ({ ...x, [k]: v }));
  const { run, pending } = useAdminAction();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => savePromotion(p), { success: "Campaign saved", onSuccess: onDone });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Eyebrow"><Input boxed value={p.eyebrow} onChange={(e) => set("eyebrow", e.target.value)} placeholder="The Festive Edit" /></Field>
        <Field label="Placement">
          <Select boxed value={p.placement} onChange={(e) => set("placement", e.target.value as Promo["placement"])}>
            <option value="home_banner">Homepage banner</option>
            <option value="home_strip">Homepage strip</option>
            <option value="division_banner">Division banner</option>
          </Select>
        </Field>
        <Field label="Title" className="sm:col-span-2"><Input boxed required value={p.title} onChange={(e) => set("title", e.target.value)} /></Field>
        <Field label="Subtitle" className="sm:col-span-2"><Input boxed value={p.subtitle} onChange={(e) => set("subtitle", e.target.value)} /></Field>
        <Field label="Button label"><Input boxed required value={p.ctaLabel} onChange={(e) => set("ctaLabel", e.target.value)} /></Field>
        <Field label="Button link" hint="Internal path, e.g. /fashion"><Input boxed required value={p.ctaHref} onChange={(e) => set("ctaHref", e.target.value)} /></Field>
        <Field label="Division (optional)">
          <Select boxed value={p.divisionId} onChange={(e) => set("divisionId", e.target.value)}>
            <option value="">All</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Sort order"><Input boxed type="number" min={0} max={999} value={p.sortOrder} onChange={(e) => set("sortOrder", Number(e.target.value))} /></Field>
        <Field label="Starts"><Input boxed type="date" value={p.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field>
        <Field label="Ends"><Input boxed type="date" value={p.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field>
      </div>
      <ImageInput folder="marketing" value={p.image} onChange={(v) => set("image", v)} />
      <label className="flex items-center gap-2 text-sm"><Toggle checked={p.isActive} onChange={(v) => set("isActive", v)} label="Active" /> Active</label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" loading={pending}>Save campaign</Button>
      </div>
    </form>
  );
}

type Coupon = {
  id?: string;
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minSubtotal: number;
  maxDiscount: number | null;
  divisionId: string;
  startsAt: string;
  endsAt: string;
  usageLimit: number | null;
  isActive: boolean;
};

export function CouponEditor({ divisions, initial }: { divisions: { id: string; name: string }[]; initial?: Coupon }) {
  return (
    <ModalTrigger label={initial ? "Edit" : "New coupon"} variant={initial ? "ghost" : "primary"} title={initial ? `Edit ${initial.code}` : "New coupon"}>
      {(close) => <CouponForm divisions={divisions} initial={initial} onDone={close} />}
    </ModalTrigger>
  );
}

function CouponForm({ divisions, initial, onDone }: { divisions: { id: string; name: string }[]; initial?: Coupon; onDone: () => void }) {
  const [c, setC] = React.useState<Coupon>(
    initial ?? { code: "", description: "", discountType: "percent", discountValue: 10, minSubtotal: 0, maxDiscount: null, divisionId: "", startsAt: "", endsAt: "", usageLimit: null, isActive: true },
  );
  const set = <K extends keyof Coupon>(k: K, v: Coupon[K]) => setC((x) => ({ ...x, [k]: v }));
  const optNum = (s: string) => (s === "" ? null : Number(s));
  const { run, pending } = useAdminAction();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => saveCoupon(c), { success: "Coupon saved", onSuccess: onDone });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Code"><Input boxed required value={c.code} onChange={(e) => set("code", e.target.value.toUpperCase())} className="font-mono uppercase" /></Field>
        <Field label="Type">
          <Select boxed value={c.discountType} onChange={(e) => set("discountType", e.target.value as Coupon["discountType"])}>
            <option value="percent">Percentage</option>
            <option value="fixed">Fixed amount (₹)</option>
          </Select>
        </Field>
        <Field label={c.discountType === "percent" ? "Percent off" : "Amount off (₹)"}><Input boxed type="number" min={1} value={c.discountValue} onChange={(e) => set("discountValue", Number(e.target.value))} /></Field>
        <Field label="Max discount (₹)" hint="Optional cap"><Input boxed type="number" min={1} value={c.maxDiscount ?? ""} onChange={(e) => set("maxDiscount", optNum(e.target.value))} /></Field>
        <Field label="Minimum order (₹)"><Input boxed type="number" min={0} value={c.minSubtotal} onChange={(e) => set("minSubtotal", Number(e.target.value))} /></Field>
        <Field label="Usage limit" hint="Leave blank for unlimited"><Input boxed type="number" min={1} value={c.usageLimit ?? ""} onChange={(e) => set("usageLimit", optNum(e.target.value))} /></Field>
        <Field label="Applies to">
          <Select boxed value={c.divisionId} onChange={(e) => set("divisionId", e.target.value)}>
            <option value="">All divisions</option>
            {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Description"><Input boxed value={c.description} onChange={(e) => set("description", e.target.value)} /></Field>
        <Field label="Starts"><Input boxed type="date" value={c.startsAt} onChange={(e) => set("startsAt", e.target.value)} /></Field>
        <Field label="Ends"><Input boxed type="date" value={c.endsAt} onChange={(e) => set("endsAt", e.target.value)} /></Field>
      </div>
      <label className="flex items-center gap-2 text-sm"><Toggle checked={c.isActive} onChange={(v) => set("isActive", v)} label="Active" /> Active</label>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" loading={pending}>Save coupon</Button>
      </div>
    </form>
  );
}
