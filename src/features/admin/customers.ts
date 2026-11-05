import "server-only";
import * as demo from "@/config/demo-data";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { previewCustomers, previewOrders } from "./preview-data";
import { safeSearch } from "./common";
import type { AdminCustomerRow, AdminOrderRow } from "./types";

/* eslint-disable @typescript-eslint/no-explicit-any */

export async function listCustomers(q?: string): Promise<AdminCustomerRow[]> {
  const term = safeSearch(q).toLowerCase();
  if (isPreviewMode) {
    const rows = previewCustomers();
    return term ? rows.filter((r) => r.fullName.toLowerCase().includes(term) || r.email.toLowerCase().includes(term)) : rows;
  }
  const sb = await createServerSupabase();
  let query = sb
    .from("profiles")
    .select("id, full_name, email, phone, created_at, is_demo, user_roles!inner(roles!inner(key))")
    .eq("user_roles.roles.key", "customer")
    .order("created_at", { ascending: false })
    .limit(500);
  if (term) query = query.or(`full_name.ilike.%${term}%,email.ilike.%${term}%`);
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  const ids = (data ?? []).map((p: any) => p.id);
  const [orders, appts] = await Promise.all([
    ids.length ? sb.from("orders").select("user_id, total, payment_status").in("user_id", ids) : Promise.resolve({ data: [] as any[] }),
    ids.length ? sb.from("appointments").select("customer_id").in("customer_id", ids) : Promise.resolve({ data: [] as any[] }),
  ]);
  return (data ?? []).map((p: any) => {
    const own = (orders.data ?? []).filter((o: any) => o.user_id === p.id);
    return {
      id: p.id,
      fullName: p.full_name || p.email,
      email: p.email,
      phone: p.phone,
      createdAt: p.created_at,
      orders: own.length,
      spend: own.filter((o: any) => o.payment_status === "successful").reduce((a: number, o: any) => a + Number(o.total), 0),
      appointments: (appts.data ?? []).filter((a: any) => a.customer_id === p.id).length,
      isDemo: p.is_demo,
    };
  });
}

export interface CustomerDetail extends AdminCustomerRow {
  addresses: { id: string; label: string; line: string; isDefault: boolean }[];
  recentOrders: AdminOrderRow[];
  wishlistCount: number;
}

export async function getCustomer(id: string): Promise<CustomerDetail | null> {
  if (isPreviewMode) {
    const c = previewCustomers().find((x) => x.id === id);
    const src = demo.demoCustomers.find((x) => x.id === id);
    if (!c || !src) return null;
    const a = src.address;
    return {
      ...c,
      addresses: [{ id: a.id, label: a.label, line: `${a.line1}, ${a.city}, ${a.state} ${a.postalCode}`, isDefault: true }],
      recentOrders: previewOrders().filter((o) => o.userId === id),
      wishlistCount: 0,
    };
  }
  const sb = await createServerSupabase();
  const { data: p, error } = await sb.from("profiles").select("id, full_name, email, phone, created_at, is_demo").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  if (!p) return null;
  const [orders, appts, addresses, wl] = await Promise.all([
    sb.from("orders").select("id, order_number, customer_name, customer_email, status, payment_status, total, created_at, is_demo, order_items(division_id, quantity)").eq("user_id", id).order("created_at", { ascending: false }).limit(50),
    sb.from("appointments").select("id", { count: "exact", head: true }).eq("customer_id", id),
    sb.from("addresses").select("id, label, line1, line2, city, state, postal_code, is_default").eq("user_id", id),
    sb.from("wishlists").select("wishlist_items(id)").eq("user_id", id).maybeSingle(),
  ]);
  const rows: AdminOrderRow[] = (orders.data ?? []).map((r: any) => ({
    id: r.id,
    orderNumber: r.order_number,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    status: r.status,
    paymentStatus: r.payment_status,
    total: Number(r.total),
    itemCount: (r.order_items ?? []).reduce((a: number, i: any) => a + i.quantity, 0),
    divisions: [...new Set<string>((r.order_items ?? []).map((i: any) => i.division_id))],
    createdAt: r.created_at,
    isDemo: r.is_demo,
  }));
  return {
    id: p.id,
    fullName: p.full_name || p.email,
    email: p.email,
    phone: p.phone,
    createdAt: p.created_at,
    isDemo: p.is_demo,
    orders: rows.length,
    spend: rows.filter((o) => o.paymentStatus === "successful").reduce((a, o) => a + o.total, 0),
    appointments: appts.count ?? 0,
    addresses: (addresses.data ?? []).map((a: any) => ({
      id: a.id,
      label: a.label,
      line: [a.line1, a.line2, a.city, `${a.state} ${a.postal_code}`].filter(Boolean).join(", "),
      isDefault: a.is_default,
    })),
    recentOrders: rows,
    wishlistCount: ((wl.data as any)?.wishlist_items ?? []).length,
  };
}
