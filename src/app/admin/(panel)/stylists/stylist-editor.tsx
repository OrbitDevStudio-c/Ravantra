"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";
import { ModalTrigger, Toggle, useAdminAction } from "@/components/admin/client";
import { ImageInput } from "@/components/admin/image-input";
import { addBlockedSlot, saveStylist } from "@/features/admin/salon-actions";
import { slugify } from "@/lib/utils";

type Hours = { weekday: number; startTime: string; endTime: string }[];
type St = {
  id?: string;
  divisionId: string;
  slug: string;
  name: string;
  title: string;
  bio: string;
  image: string;
  specialties: string;
  experienceYears: number;
  isActive: boolean;
  serviceIds: string[];
  hours: Hours;
};

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export function StylistEditor({ divisions, services, initial }: { divisions: { id: string; name: string }[]; services: { id: string; name: string; category: string }[]; initial?: St }) {
  return (
    <ModalTrigger label={initial ? "Edit" : "New stylist"} variant={initial ? "ghost" : "primary"} title={initial ? `Edit ${initial.name}` : "New stylist"} wide>
      {(close) => <StylistForm divisions={divisions} services={services} initial={initial} onDone={close} />}
    </ModalTrigger>
  );
}

function StylistForm({ divisions, services, initial, onDone }: { divisions: { id: string; name: string }[]; services: { id: string; name: string; category: string }[]; initial?: St; onDone: () => void }) {
  const [s, setS] = React.useState<St>(
    initial ?? {
      divisionId: divisions[0]?.id ?? "",
      slug: "",
      name: "",
      title: "",
      bio: "",
      image: "",
      specialties: "",
      experienceYears: 3,
      isActive: true,
      serviceIds: [],
      hours: [2, 3, 4, 5, 6].map((weekday) => ({ weekday, startTime: "10:00", endTime: "19:00" })),
    },
  );
  const set = <K extends keyof St>(k: K, v: St[K]) => setS((p) => ({ ...p, [k]: v }));
  const { run, pending } = useAdminAction();

  const toggleDay = (weekday: number, on: boolean) =>
    set("hours", on ? [...s.hours, { weekday, startTime: "10:00", endTime: "19:00" }].sort((a, b) => a.weekday - b.weekday) : s.hours.filter((h) => h.weekday !== weekday));
  const setHour = (weekday: number, key: "startTime" | "endTime", value: string) => set("hours", s.hours.map((h) => (h.weekday === weekday ? { ...h, [key]: value } : h)));

  return (
    <form
      className="space-y-5"
      onSubmit={(e) => {
        e.preventDefault();
        run(
          () =>
            saveStylist({
              ...s,
              specialties: s.specialties.split(",").map((x) => x.trim()).filter(Boolean),
            }),
          { success: "Stylist saved", onSuccess: onDone },
        );
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Name">
          <Input boxed required value={s.name} onChange={(e) => setS((p) => ({ ...p, name: e.target.value, slug: initial ? p.slug : slugify(e.target.value) }))} />
        </Field>
        <Field label="Title">
          <Input boxed value={s.title} onChange={(e) => set("title", e.target.value)} placeholder="Senior Stylist" />
        </Field>
        <Field label="Slug">
          <Input boxed required value={s.slug} onChange={(e) => set("slug", e.target.value)} />
        </Field>
        <Field label="Years of experience">
          <Input boxed type="number" min={0} max={60} value={s.experienceYears} onChange={(e) => set("experienceYears", Number(e.target.value))} />
        </Field>
        {divisions.length > 1 && (
          <Field label="Division">
            <Select boxed value={s.divisionId} onChange={(e) => set("divisionId", e.target.value)}>
              {divisions.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
          </Field>
        )}
        <Field label="Specialties" hint="Comma separated" className="sm:col-span-2">
          <Input boxed value={s.specialties} onChange={(e) => set("specialties", e.target.value)} />
        </Field>
      </div>
      <Field label="Bio">
        <Textarea boxed rows={3} value={s.bio} onChange={(e) => set("bio", e.target.value)} maxLength={1000} />
      </Field>
      <ImageInput folder="salon" value={s.image} onChange={(v) => set("image", v)} label="Portrait" />

      <fieldset>
        <legend className="eyebrow mb-2 text-[0.6rem] text-ink-soft">Services performed</legend>
        <div className="grid gap-1.5 sm:grid-cols-2">
          {services.map((svc) => (
            <label key={svc.id} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={s.serviceIds.includes(svc.id)}
                onChange={(e) => set("serviceIds", e.target.checked ? [...s.serviceIds, svc.id] : s.serviceIds.filter((x) => x !== svc.id))}
                className="accent-espresso"
              />
              {svc.name} <span className="text-xs text-ink-mute">{svc.category}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="eyebrow mb-2 text-[0.6rem] text-ink-soft">Working hours (IST)</legend>
        <div className="divide-y divide-line border border-line">
          {DAYS.map((d, i) => {
            const wh = s.hours.find((h) => h.weekday === i);
            return (
              <div key={d} className="flex items-center gap-3 px-3 py-2 text-sm">
                <Toggle checked={Boolean(wh)} onChange={(v) => toggleDay(i, v)} label={`Works on ${d}`} />
                <span className="w-24">{d}</span>
                {wh ? (
                  <span className="flex items-center gap-2">
                    <input type="time" step={900} value={wh.startTime} onChange={(e) => setHour(i, "startTime", e.target.value)} className="field-box !w-28 !py-1" aria-label={`${d} start`} />
                    –
                    <input type="time" step={900} value={wh.endTime} onChange={(e) => setHour(i, "endTime", e.target.value)} className="field-box !w-28 !py-1" aria-label={`${d} end`} />
                  </span>
                ) : (
                  <span className="text-xs text-ink-mute">Day off</span>
                )}
              </div>
            );
          })}
        </div>
      </fieldset>

      <label className="flex items-center gap-2 text-sm"><Toggle checked={s.isActive} onChange={(v) => set("isActive", v)} label="Active" /> Accepting bookings</label>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" loading={pending}>Save stylist</Button>
      </div>
    </form>
  );
}

export function BlockSlotForm({ stylists }: { stylists: { id: string; name: string }[] }) {
  return (
    <ModalTrigger label="Block time" title="Block time" size="sm">
      {(close) => <BlockForm stylists={stylists} onDone={close} />}
    </ModalTrigger>
  );
}

function BlockForm({ stylists, onDone }: { stylists: { id: string; name: string }[]; onDone: () => void }) {
  const [today] = React.useState(() => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10));
  const [b, setB] = React.useState({ stylistId: stylists[0]?.id ?? "", date: today, start: "13:00", end: "14:00", reason: "" });
  const { run, pending } = useAdminAction();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => addBlockedSlot(b), { success: "Time blocked", onSuccess: onDone });
      }}
    >
      <Field label="Stylist">
        <Select boxed value={b.stylistId} onChange={(e) => setB({ ...b, stylistId: e.target.value })}>
          {stylists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Date">
          <Input boxed type="date" min={today} value={b.date} onChange={(e) => setB({ ...b, date: e.target.value })} />
        </Field>
        <Field label="From">
          <Input boxed type="time" step={900} value={b.start} onChange={(e) => setB({ ...b, start: e.target.value })} />
        </Field>
        <Field label="To">
          <Input boxed type="time" step={900} value={b.end} onChange={(e) => setB({ ...b, end: e.target.value })} />
        </Field>
      </div>
      <Field label="Reason">
        <Input boxed value={b.reason} onChange={(e) => setB({ ...b, reason: e.target.value })} placeholder="Training, leave…" maxLength={120} />
      </Field>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button type="submit" size="sm" loading={pending}>Block time</Button>
      </div>
    </form>
  );
}
