import "server-only";
import { cache } from "react";
import { isPreviewMode } from "@/lib/env";
import { createPublicSupabase } from "@/lib/supabase/server";
import * as demo from "@/config/demo-data";
import type { Service, Stylist } from "@/types";
import { SERVICE_COLUMNS, STYLIST_COLUMNS, mapService, mapStylist } from "@/features/catalog/mappers";
import { addDays, istToUtc, todayIst } from "./slots";

export const getServices = cache(async (): Promise<Service[]> => {
  if (isPreviewMode) return demo.services.filter((s) => s.isActive);
  const sb = createPublicSupabase();
  const { data, error } = await sb.from("services").select(SERVICE_COLUMNS).eq("is_active", true).order("category").order("price");
  if (error) throw error;
  return (data ?? []).map(mapService);
});

export const getServiceBySlug = cache(async (slug: string) => {
  const all = await getServices();
  return all.find((s) => s.slug === slug) ?? null;
});

export const getStylists = cache(async (): Promise<Stylist[]> => {
  if (isPreviewMode) return demo.stylists.filter((s) => s.isActive);
  const sb = createPublicSupabase();
  const { data, error } = await sb.from("stylists").select(STYLIST_COLUMNS).eq("is_active", true).order("name");
  if (error) throw error;
  return (data ?? []).map(mapStylist);
});

/** Busy ranges for one stylist across [fromDate, toDate] (IST dates). */
export async function getBusyRanges(stylistId: string, fromDate: string, toDate: string) {
  const from = istToUtc(fromDate, "00:00").toISOString();
  const to = istToUtc(addDays(toDate, 1), "00:00").toISOString();

  if (isPreviewMode) {
    const today = todayIst();
    return demo.demoAppointments
      .filter((a) => a.stylistId === stylistId && (a.status === "pending" || a.status === "confirmed"))
      .map((a) => {
        const start = istToUtc(addDays(today, a.dayOffset), a.startTime);
        return { startsAt: start.toISOString(), endsAt: new Date(start.getTime() + a.durationMin * 60000).toISOString() };
      })
      .filter((r) => r.startsAt < to && r.endsAt > from);
  }

  // Not cached: availability must be live.
  const { createClient } = await import("@supabase/supabase-js");
  const { SUPABASE_URL, SUPABASE_ANON_KEY } = await import("@/lib/env");
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { fetch: (i, init) => fetch(i, { ...init, cache: "no-store" }) },
  });
  const { data, error } = await sb.rpc("stylist_busy_ranges", { p_stylist: stylistId, p_from: from, p_to: to });
  if (error) throw error;
  return ((data ?? []) as { starts_at: string; ends_at: string }[]).map((r) => ({ startsAt: r.starts_at, endsAt: r.ends_at }));
}

