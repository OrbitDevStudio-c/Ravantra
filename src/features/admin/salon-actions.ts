"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import * as demo from "@/config/demo-data";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { appointmentEmail, sendEmail } from "@/lib/email";
import { generateSlots, type Slot } from "@/features/salon/slots";
import { mapStylist, STYLIST_COLUMNS } from "@/features/catalog/mappers";
import { previewAppointments } from "./preview-data";
import { guarded, logActivity, must, UserError } from "./shared";
import type { AdminResult } from "./types";

const revalidateSalon = () => {
  revalidatePath("/admin/appointments");
  revalidatePath("/admin/services");
  revalidatePath("/admin/stylists");
  revalidatePath("/salon-spa", "layout");
};

/* ---------------- Appointments ---------------- */

const statusSchema = z.enum(["pending", "confirmed", "completed", "cancelled", "no_show"]);

async function notify(sb: Awaited<ReturnType<typeof createServerSupabase>>, id: string) {
  const { data } = await sb
    .from("appointments")
    .select("reference, customer_name, customer_email, starts_at, status, service:services(name), stylist:stylists(name)")
    .eq("id", id)
    .maybeSingle();
  if (!data) return;
  /* eslint-disable @typescript-eslint/no-explicit-any */
  const d = data as any;
  const one = (v: any) => (Array.isArray(v) ? v[0] : v);
  await sendEmail({
    to: d.customer_email,
    subject: `RAVANTRA Salon & Spa — appointment ${d.status} (${d.reference})`,
    html: appointmentEmail({ reference: d.reference, customerName: d.customer_name, service: one(d.service)?.name ?? "", stylist: one(d.stylist)?.name ?? "", startsAt: d.starts_at, status: d.status }),
  });
}

export async function setAppointmentStatus(id: string, status: string, note?: string) {
  return guarded("appointments.manage", async ({ sb }) => {
    const aid = z.uuid().parse(id);
    const s = statusSchema.parse(status);
    must(await sb.rpc("admin_update_appointment", { p_id: aid, p_status: s, p_starts_at: null, p_stylist: null, p_note: note?.slice(0, 280) || null }));
    if (s === "confirmed" || s === "cancelled") void notify(sb, aid);
    revalidateSalon();
  });
}

export async function rescheduleAppointment(id: string, startsAt: string, stylistId: string) {
  return guarded("appointments.manage", async ({ sb }) => {
    const aid = z.uuid().parse(id);
    const at = z.iso.datetime().parse(startsAt);
    const st = z.uuid().parse(stylistId);
    must(await sb.rpc("admin_update_appointment", { p_id: aid, p_status: null, p_starts_at: at, p_stylist: st, p_note: null }));
    void notify(sb, aid);
    revalidateSalon();
  });
}

/** Available start times for an appointment on a given IST date with a given stylist (excludes its own slot). */
export async function getRescheduleSlots(appointmentId: string, stylistId: string, date: string): Promise<AdminResult<Slot[]>> {
  const parsed = z.object({ a: z.uuid(), s: z.uuid(), d: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }).safeParse({ a: appointmentId, s: stylistId, d: date });
  if (!parsed.success) return { ok: false, error: "Invalid date or stylist." };

  if (isPreviewMode) {
    const appt = previewAppointments().find((x) => x.id === appointmentId);
    const stylist = demo.stylists.find((x) => x.id === stylistId);
    if (!appt || !stylist) return { ok: false, error: "Not found." };
    const busy = previewAppointments()
      .filter((x) => x.stylistId === stylistId && x.id !== appointmentId && ["pending", "confirmed"].includes(x.status))
      .map((x) => ({ startsAt: x.startsAt, endsAt: x.endsAt }));
    return { ok: true, data: generateSlots({ date, durationMin: appt.durationMin, workingHours: stylist.workingHours, busy, now: new Date(Date.now() - 3600000) }) };
  }

  return guarded("appointments.manage", async ({ sb }) => {
    const appt = must(await sb.from("appointments").select("id, service_id, starts_at, ends_at, stylist_id, service:services(duration_min)").eq("id", appointmentId).maybeSingle()) as any;
    if (!appt) throw new UserError("Appointment not found.");
    const stylist = must(await sb.from("stylists").select(STYLIST_COLUMNS).eq("id", stylistId).maybeSingle());
    if (!stylist) throw new UserError("Stylist not found.");
    const st = mapStylist(stylist);
    const svc = Array.isArray(appt.service) ? appt.service[0] : appt.service;
    if (!st.serviceIds.includes(appt.service_id)) throw new UserError("This stylist doesn't offer the booked service.");
    const from = new Date(`${date}T00:00:00+05:30`).toISOString();
    const to = new Date(+new Date(from) + 86400000).toISOString();
    const ranges = must(await sb.rpc("stylist_busy_ranges", { p_stylist: stylistId, p_from: from, p_to: to })) as { starts_at: string; ends_at: string }[];
    const busy = ranges
      .filter((r) => !(appt.stylist_id === stylistId && +new Date(r.starts_at) === +new Date(appt.starts_at) && +new Date(r.ends_at) === +new Date(appt.ends_at)))
      .map((r) => ({ startsAt: r.starts_at, endsAt: r.ends_at }));
    // staff may book with less lead time than customers
    return generateSlots({ date, durationMin: svc?.duration_min ?? 60, workingHours: st.workingHours, busy, now: new Date(Date.now() - 3600000) });
  });
}

/* ---------------- Services ---------------- */

const serviceSchema = z.object({
  id: z.string().optional(),
  divisionId: z.uuid(),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, "Slug: lowercase letters, numbers, dashes"),
  category: z.string().trim().min(2).max(40),
  name: z.string().trim().min(2).max(120),
  description: z.string().trim().max(1000),
  durationMin: z.number().int().min(15).max(480).refine((n) => n % 15 === 0, "Duration must be a multiple of 15 minutes"),
  price: z.number().min(0).max(1000000),
  image: z.url().optional().or(z.literal("")),
  isPopular: z.boolean(),
  isActive: z.boolean(),
});

export async function saveService(input: z.input<typeof serviceSchema>) {
  const parsed = serviceSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid service" };
  const s = parsed.data;
  return guarded(
    "appointments.manage",
    async (ctx) => {
      const row = {
        division_id: s.divisionId,
        slug: s.slug,
        category: s.category,
        name: s.name,
        description: s.description,
        duration_min: s.durationMin,
        price: s.price,
        image: s.image || null,
        is_popular: s.isPopular,
        is_active: s.isActive,
      };
      if (s.id) {
        const r = must(await ctx.sb.from("services").update(row).eq("id", s.id).select("id"));
        if (!r.length) throw new UserError("You don't have permission to edit this service.");
      } else must(await ctx.sb.from("services").insert(row));
      await logActivity(ctx, { action: s.id ? "service.updated" : "service.created", entityType: "service", divisionId: s.divisionId, summary: `${s.id ? "Updated" : "Added"} service ${s.name}` });
      revalidateSalon();
    },
    s.divisionId,
  );
}

/* ---------------- Stylists ---------------- */

const stylistSchema = z.object({
  id: z.string().optional(),
  divisionId: z.uuid(),
  slug: z.string().trim().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/),
  name: z.string().trim().min(2).max(120),
  title: z.string().trim().max(120),
  bio: z.string().trim().max(1000),
  image: z.url().optional().or(z.literal("")),
  specialties: z.array(z.string().trim().min(1).max(40)).max(10),
  experienceYears: z.number().int().min(0).max(60),
  isActive: z.boolean(),
  serviceIds: z.array(z.uuid()).max(50),
  hours: z
    .array(z.object({ weekday: z.number().int().min(0).max(6), startTime: z.string().regex(/^\d{2}:\d{2}$/), endTime: z.string().regex(/^\d{2}:\d{2}$/) }))
    .max(7)
    .refine((h) => h.every((x) => x.endTime > x.startTime), "Closing time must be after opening time")
    .refine((h) => new Set(h.map((x) => x.weekday)).size === h.length, "Each weekday once"),
});

export async function saveStylist(input: z.input<typeof stylistSchema>): Promise<AdminResult<{ id: string }>> {
  const parsed = stylistSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid stylist" };
  const s = parsed.data;
  return guarded(
    "appointments.manage",
    async (ctx) => {
      const row = {
        division_id: s.divisionId,
        slug: s.slug,
        name: s.name,
        title: s.title,
        bio: s.bio,
        image: s.image || null,
        specialties: s.specialties,
        experience_years: s.experienceYears,
        is_active: s.isActive,
      };
      let id = s.id;
      if (id) {
        const r = must(await ctx.sb.from("stylists").update(row).eq("id", id).select("id"));
        if (!r.length) throw new UserError("You don't have permission to edit this stylist.");
      } else {
        id = (must(await ctx.sb.from("stylists").insert(row).select("id").single()) as { id: string }).id;
      }
      // services
      must(await ctx.sb.from("stylist_services").delete().eq("stylist_id", id));
      if (s.serviceIds.length) must(await ctx.sb.from("stylist_services").insert(s.serviceIds.map((service_id) => ({ stylist_id: id, service_id }))));
      // working hours
      must(await ctx.sb.from("working_hours").delete().eq("stylist_id", id));
      if (s.hours.length) must(await ctx.sb.from("working_hours").insert(s.hours.map((h) => ({ stylist_id: id, weekday: h.weekday, start_time: h.startTime, end_time: h.endTime }))));
      await logActivity(ctx, { action: s.id ? "stylist.updated" : "stylist.created", entityType: "stylist", entityId: id, divisionId: s.divisionId, summary: `${s.id ? "Updated" : "Added"} stylist ${s.name}` });
      revalidateSalon();
      return { id: id! };
    },
    s.divisionId,
  );
}

const blockSchema = z.object({ stylistId: z.uuid(), date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/), start: z.string().regex(/^\d{2}:\d{2}$/), end: z.string().regex(/^\d{2}:\d{2}$/), reason: z.string().trim().max(120) });

export async function addBlockedSlot(input: z.input<typeof blockSchema>) {
  const parsed = blockSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Enter a valid date and time range." };
  const b = parsed.data;
  if (b.end <= b.start) return { ok: false as const, error: "End time must be after start time." };
  return guarded("appointments.manage", async (ctx) => {
    must(
      await ctx.sb.from("blocked_slots").insert({
        stylist_id: b.stylistId,
        starts_at: new Date(`${b.date}T${b.start}:00+05:30`).toISOString(),
        ends_at: new Date(`${b.date}T${b.end}:00+05:30`).toISOString(),
        reason: b.reason || null,
        created_by: ctx.access.userId,
      }),
    );
    revalidateSalon();
  });
}

export async function removeBlockedSlot(id: string) {
  return guarded("appointments.manage", async (ctx) => {
    must(await ctx.sb.from("blocked_slots").delete().eq("id", z.uuid().parse(id)));
    revalidateSalon();
  });
}
