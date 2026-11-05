import "server-only";
import * as demo from "@/config/demo-data";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { mapService, mapStylist, SERVICE_COLUMNS, STYLIST_COLUMNS } from "@/features/catalog/mappers";
import type { BlockedSlot, Service, Stylist } from "@/types";
import { previewAppointments } from "./preview-data";
import type { AdminAppointmentRow } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */
const one = (v: any) => (Array.isArray(v) ? v[0] : v);

export interface AppointmentFilters {
  scope?: "upcoming" | "past" | "all";
  status?: string;
  stylist?: string;
  date?: string; // IST yyyy-mm-dd
  customerId?: string;
}

export async function listAppointments(f: AppointmentFilters = {}): Promise<AdminAppointmentRow[]> {
  let rows: AdminAppointmentRow[];
  if (isPreviewMode) {
    rows = previewAppointments();
  } else {
    const sb = await createServerSupabase();
    let query = sb
      .from("appointments")
      .select("id, reference, customer_id, customer_name, customer_email, customer_phone, service_id, stylist_id, starts_at, ends_at, status, price, notes, is_demo, service:services(name, duration_min), stylist:stylists(name)")
      .order("starts_at", { ascending: f.scope !== "past" })
      .limit(500);
    const now = new Date().toISOString();
    if (f.scope === "upcoming") query = query.gte("starts_at", now);
    if (f.scope === "past") query = query.lt("starts_at", now);
    if (f.status) query = query.eq("status", f.status);
    if (f.stylist) query = query.eq("stylist_id", f.stylist);
    if (f.customerId) query = query.eq("customer_id", f.customerId);
    if (f.date) {
      const start = new Date(`${f.date}T00:00:00+05:30`);
      query = query.gte("starts_at", start.toISOString()).lt("starts_at", new Date(start.getTime() + 86400000).toISOString());
    }
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((a: any) => ({
      id: a.id,
      reference: a.reference,
      customerId: a.customer_id,
      customerName: a.customer_name,
      customerEmail: a.customer_email,
      customerPhone: a.customer_phone,
      serviceId: a.service_id,
      serviceName: one(a.service)?.name ?? "",
      durationMin: one(a.service)?.duration_min ?? 0,
      stylistId: a.stylist_id,
      stylistName: one(a.stylist)?.name ?? "",
      startsAt: a.starts_at,
      endsAt: a.ends_at,
      status: a.status,
      price: Number(a.price),
      notes: a.notes,
      isDemo: a.is_demo,
    }));
  }
  const now = Date.now();
  if (f.scope === "upcoming") rows = rows.filter((r) => +new Date(r.startsAt) >= now);
  if (f.scope === "past") rows = rows.filter((r) => +new Date(r.startsAt) < now).reverse();
  if (f.status) rows = rows.filter((r) => r.status === f.status);
  if (f.stylist) rows = rows.filter((r) => r.stylistId === f.stylist);
  if (f.customerId) rows = rows.filter((r) => r.customerId === f.customerId);
  if (f.date) {
    const start = +new Date(`${f.date}T00:00:00+05:30`);
    rows = rows.filter((r) => +new Date(r.startsAt) >= start && +new Date(r.startsAt) < start + 86400000);
  }
  return rows;
}

export async function listAdminServices(): Promise<(Service & { divisionId: string })[]> {
  if (isPreviewMode) return demo.services.map((s) => ({ ...s, divisionId: demo.DIVISION_IDS.salon }));
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("services").select(`${SERVICE_COLUMNS}, division_id`).order("category").order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ ...mapService(r), divisionId: r.division_id }));
}

export async function listAdminStylists(): Promise<(Stylist & { divisionId: string })[]> {
  if (isPreviewMode) return demo.stylists.map((s) => ({ ...s, divisionId: demo.DIVISION_IDS.salon }));
  const sb = await createServerSupabase();
  const { data, error } = await sb.from("stylists").select(`${STYLIST_COLUMNS}, division_id`).order("name");
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => ({ ...mapStylist(r), divisionId: r.division_id }));
}

export async function listBlockedSlots(stylistId?: string): Promise<BlockedSlot[]> {
  if (isPreviewMode) return [];
  const sb = await createServerSupabase();
  let q = sb.from("blocked_slots").select("id, stylist_id, starts_at, ends_at, reason").gte("ends_at", new Date().toISOString()).order("starts_at");
  if (stylistId) q = q.eq("stylist_id", stylistId);
  const { data, error } = await q;
  if (error) throw new Error(error.message);
  return (data ?? []).map((b: any) => ({ id: b.id, stylistId: b.stylist_id, startsAt: b.starts_at, endsAt: b.ends_at, reason: b.reason }));
}

export async function getSalonDivisions() {
  if (isPreviewMode) return demo.divisions.filter((d) => d.kind === "services");
  const sb = await createServerSupabase();
  const { data } = await sb.from("business_divisions").select("id, short_name, kind").eq("kind", "services");
  return (data ?? []).map((d: any) => ({ id: d.id as string, shortName: d.short_name as string }));
}
