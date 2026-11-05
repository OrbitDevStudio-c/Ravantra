"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { isSupabaseConfigured } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { bookingSchema, fieldErrors } from "@/lib/validations";
import { appointmentEmail, sendEmail } from "@/lib/email";
import { friendlyDbError } from "@/lib/utils";
import { getBusyRanges, getServices, getStylists } from "@/features/salon/queries";
import { BOOKING_WINDOW_DAYS, addDays, generateSlots, todayIst, type Slot } from "@/features/salon/slots";
import type { ActionResult } from "@/types";

const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

export async function getAvailability(input: { serviceId: string; stylistId: string; date: string }): Promise<ActionResult<Slot[]>> {
  const parsed = z.object({ serviceId: z.uuid(), stylistId: z.uuid(), date: dateSchema }).safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid selection." };
  const { serviceId, stylistId, date } = parsed.data;
  const today = todayIst();
  if (date < today || date > addDays(today, BOOKING_WINDOW_DAYS)) return { ok: true, data: [] };

  const [services, stylists] = await Promise.all([getServices(), getStylists()]);
  const service = services.find((s) => s.id === serviceId);
  const stylist = stylists.find((s) => s.id === stylistId);
  if (!service || !stylist || !stylist.serviceIds.includes(serviceId)) return { ok: false, error: "This specialist doesn't offer that service." };

  try {
    const busy = await getBusyRanges(stylistId, date, date);
    return { ok: true, data: generateSlots({ date, durationMin: service.durationMin, workingHours: stylist.workingHours, busy }) };
  } catch (e) {
    console.error("[availability]", e);
    return { ok: false, error: "Couldn't load availability. Please try again." };
  }
}

export async function bookAppointment(input: z.input<typeof bookingSchema>): Promise<ActionResult<{ id: string; reference: string; startsAt: string; endsAt: string }>> {
  if (!isSupabaseConfigured) {
    return { ok: false, error: "Booking is disabled in preview mode. Connect Supabase (see README) to accept real bookings." };
  }
  const parsed = bookingSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Please check your details.", fieldErrors: fieldErrors(parsed.error) };
  const b = parsed.data;

  const sb = await createServerSupabase();
  const { data, error } = await sb.rpc("book_appointment", {
    p_service: b.serviceId,
    p_stylist: b.stylistId,
    p_starts_at: b.startsAt,
    p_name: b.name,
    p_email: b.email,
    p_phone: b.phone,
    p_notes: b.notes || null,
  });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  const res = data as { appointment_id: string; reference: string; starts_at: string; ends_at: string };

  const [services, stylists] = await Promise.all([getServices(), getStylists()]);
  await sendEmail({
    to: b.email,
    subject: `Appointment request ${res.reference} — RAVANTRA Salon & Spa`,
    html: appointmentEmail({
      reference: res.reference,
      customerName: b.name,
      service: services.find((s) => s.id === b.serviceId)?.name ?? "Service",
      stylist: stylists.find((s) => s.id === b.stylistId)?.name ?? "Specialist",
      startsAt: res.starts_at,
      status: "pending",
    }),
  });
  revalidatePath("/account/appointments");
  return { ok: true, data: { id: res.appointment_id, reference: res.reference, startsAt: res.starts_at, endsAt: res.ends_at } };
}

export async function cancelMyAppointment(id: string, reason?: string): Promise<ActionResult> {
  if (!isSupabaseConfigured || !z.uuid().safeParse(id).success) return { ok: false, error: "Invalid appointment." };
  const sb = await createServerSupabase();
  const { error } = await sb.rpc("cancel_my_appointment", { p_id: id, p_reason: reason?.slice(0, 200) || null });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath("/account/appointments");
  return { ok: true };
}

export async function rescheduleMyAppointment(id: string, startsAt: string): Promise<ActionResult> {
  if (!isSupabaseConfigured) return { ok: false, error: "Invalid appointment." };
  const parsed = z.object({ id: z.uuid(), startsAt: z.iso.datetime() }).safeParse({ id, startsAt });
  if (!parsed.success) return { ok: false, error: "Invalid time." };
  const sb = await createServerSupabase();
  const { error } = await sb.rpc("reschedule_my_appointment", { p_id: parsed.data.id, p_starts_at: parsed.data.startsAt });
  if (error) return { ok: false, error: friendlyDbError(error.message) };
  revalidatePath("/account/appointments");
  return { ok: true };
}
