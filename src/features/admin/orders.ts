import "server-only";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { previewOrders } from "./preview-data";
import { safeSearch } from "./common";
import type { AdminOrderDetail, AdminOrderRow, Paged } from "./types";

export interface OrderFilters {
  q?: string;
  status?: string;
  payment?: string;
  division?: string;
  page?: number;
  pageSize?: number;
}

const STATUSES = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"];
const PAYMENTS = ["pending", "successful", "failed", "refunded"];

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapRow(r: any): AdminOrderRow {
  const items = (r.order_items ?? []) as { division_id: string; quantity: number }[];
  return {
    id: r.id,
    orderNumber: r.order_number,
    customerName: r.customer_name,
    customerEmail: r.customer_email,
    status: r.status,
    paymentStatus: r.payment_status,
    total: Number(r.total),
    itemCount: items.reduce((a, i) => a + i.quantity, 0),
    divisions: [...new Set(items.map((i) => i.division_id))],
    createdAt: r.created_at,
    isDemo: r.is_demo,
  };
}

export async function listOrders(f: OrderFilters): Promise<Paged<AdminOrderRow>> {
  const page = f.page ?? 1;
  const pageSize = f.pageSize ?? 20;
  const q = safeSearch(f.q);
  const status = STATUSES.includes(f.status ?? "") ? f.status : undefined;
  const payment = PAYMENTS.includes(f.payment ?? "") ? f.payment : undefined;

  if (isPreviewMode) {
    let rows: AdminOrderRow[] = previewOrders();
    if (status) rows = rows.filter((r) => r.status === status);
    if (payment) rows = rows.filter((r) => r.paymentStatus === payment);
    if (f.division) rows = rows.filter((r) => r.divisions.includes(f.division!));
    if (q) {
      const t = q.toLowerCase();
      rows = rows.filter((r) => [r.orderNumber, r.customerEmail, r.customerName].some((x) => x.toLowerCase().includes(t)));
    }
    return { rows: rows.slice((page - 1) * pageSize, page * pageSize), total: rows.length, page, pageSize };
  }

  const sb = await createServerSupabase();
  const embed = f.division ? "order_items!inner(division_id, quantity)" : "order_items(division_id, quantity)";
  let query = sb
    .from("orders")
    .select(`id, order_number, customer_name, customer_email, status, payment_status, total, created_at, is_demo, ${embed}`, { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);
  if (status) query = query.eq("status", status);
  if (payment) query = query.eq("payment_status", payment);
  if (f.division) query = query.eq("order_items.division_id", f.division);
  if (q) query = query.or(`order_number.ilike.%${q}%,customer_email.ilike.%${q}%,customer_name.ilike.%${q}%`);
  const { data, error, count } = await query;
  if (error) throw new Error(error.message);
  return { rows: (data ?? []).map(mapRow), total: count ?? 0, page, pageSize };
}

export async function getOrder(id: string): Promise<AdminOrderDetail | null> {
  if (isPreviewMode) return previewOrders().find((o) => o.id === id) ?? null;
  const sb = await createServerSupabase();
  const { data: r, error } = await sb
    .from("orders")
    .select(
      `id, order_number, user_id, customer_name, customer_email, customer_phone, status, payment_status, subtotal, discount_total,
       shipping_total, total, coupon_code, shipping_address, notes, created_at, is_demo,
       order_items(id, product_id, product_name, variant_name, sku, image, unit_price, quantity, line_total, division_id),
       payments(provider, provider_order_id, provider_payment_id, amount, status, method, failure_reason, refunded_amount, created_at),
       order_status_history(status, note, created_at)`,
    )
    .eq("id", id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!r) return null;
  const { data: canManage } = await sb.rpc("can_manage_order", { p_order: id });
  const base = mapRow(r);
  const pay = (r.payments ?? [])[0] as any;
  return {
    ...base,
    userId: r.user_id,
    customerPhone: r.customer_phone,
    subtotal: Number(r.subtotal),
    discountTotal: Number(r.discount_total),
    shippingTotal: Number(r.shipping_total),
    couponCode: r.coupon_code,
    notes: r.notes,
    shippingAddress: r.shipping_address ?? {},
    items: (r.order_items ?? []).map((i: any) => ({
      id: i.id,
      productId: i.product_id,
      productName: i.product_name,
      variantName: i.variant_name,
      sku: i.sku,
      image: i.image,
      unitPrice: Number(i.unit_price),
      quantity: i.quantity,
      lineTotal: Number(i.line_total),
      divisionId: i.division_id,
    })),
    payment: pay
      ? {
          provider: pay.provider,
          providerOrderId: pay.provider_order_id,
          providerPaymentId: pay.provider_payment_id,
          amount: Number(pay.amount),
          status: pay.status,
          method: pay.method,
          failureReason: pay.failure_reason,
          refundedAmount: Number(pay.refunded_amount ?? 0),
          createdAt: pay.created_at,
        }
      : null,
    history: [...(r.order_status_history ?? [])]
      .sort((a: any, b: any) => +new Date(a.created_at) - +new Date(b.created_at))
      .map((h: any) => ({ status: h.status, note: h.note, createdAt: h.created_at })),
    canManage: Boolean(canManage),
  };
}

export const NEXT_STATUSES: Record<string, string[]> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipped", "cancelled"],
  shipped: ["delivered"],
};
