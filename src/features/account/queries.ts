import "server-only";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export interface MyOrderRow {
  id: string;
  order_number: string;
  status: string;
  payment_status: string;
  total: number;
  created_at: string;
  order_items: { id: string; product_name: string; image: string | null; quantity: number }[];
}

export async function getMyOrders(limit = 50): Promise<MyOrderRow[]> {
  if (isPreviewMode) return [];
  const sb = await createServerSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb
    .from("orders")
    .select("id, order_number, status, payment_status, total, created_at, order_items(id, product_name, image, quantity)")
    .eq("user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []) as MyOrderRow[];
}

export async function getMyOrder(id: string) {
  if (isPreviewMode) return null;
  const sb = await createServerSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return null;
  const { data } = await sb
    .from("orders")
    .select(
      "id, order_number, status, payment_status, subtotal, discount_total, shipping_total, total, coupon_code, shipping_address, notes, created_at, stock_released, is_demo, order_items(id, product_name, variant_name, sku, image, unit_price, quantity, line_total, product_id, products(slug)), order_status_history(id, status, note, created_at), payments(provider, status, method, amount, provider_payment_id, failure_reason, created_at)",
    )
    .eq("id", id)
    .eq("user_id", auth.user.id)
    .maybeSingle();
  return data;
}

export interface MyAppointmentRow {
  id: string;
  reference: string;
  starts_at: string;
  ends_at: string;
  status: string;
  price: number;
  notes: string | null;
  is_demo: boolean;
  service_id: string;
  stylist_id: string;
  services: { name: string; slug: string; image: string | null; duration_min: number } | null;
  stylists: { name: string; slug: string; image: string | null } | null;
}

export async function getMyAppointments(): Promise<MyAppointmentRow[]> {
  if (isPreviewMode) return [];
  const sb = await createServerSupabase();
  const { data: auth } = await sb.auth.getUser();
  if (!auth.user) return [];
  const { data } = await sb
    .from("appointments")
    .select("id, reference, starts_at, ends_at, status, price, notes, is_demo, service_id, stylist_id, services(name, slug, image, duration_min), stylists(name, slug, image)")
    .eq("customer_id", auth.user.id)
    .order("starts_at", { ascending: false })
    .limit(100);
  return (data ?? []) as unknown as MyAppointmentRow[];
}
