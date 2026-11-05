import "server-only";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import * as P from "./preview";
import type {
  AppointmentPoint,
  CustomerGrowth,
  DailyPoint,
  DivisionSales,
  InventoryByDivision,
  Overview,
  RevenuePoint,
  ServicePopularity,
  StatusCount,
  TopProduct,
} from "./types";

/* All numbers come from Postgres report_* functions (scoped per caller) or, in preview mode, from demo data. */

/* eslint-disable @typescript-eslint/no-explicit-any */
async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const sb = await createServerSupabase();
  const { data, error } = await sb.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}
const n = (v: unknown) => Number(v ?? 0);

export async function getOverview(days = 30): Promise<Overview> {
  if (isPreviewMode) return P.previewOverview(days);
  const o = await rpc<Record<string, any>>("report_overview", { p_days: days });
  return {
    revenue: n(o.revenue),
    revenuePrev: n(o.revenue_prev),
    revenueAllTime: n(o.revenue_all_time),
    orders: n(o.orders),
    ordersPrev: n(o.orders_prev),
    ordersAllTime: n(o.orders_all_time),
    units: n(o.units),
    pendingOrders: n(o.pending_orders),
    customers: n(o.customers),
    newCustomers: n(o.new_customers),
    appointments: n(o.appointments),
    appointmentsUpcoming: n(o.appointments_upcoming),
    appointmentRevenue: n(o.appointment_revenue),
    activeProducts: n(o.active_products),
    lowStock: n(o.low_stock),
    canSeeSales: Boolean(o.can_see_sales),
    canSeeSalon: Boolean(o.can_see_salon),
    canSeeStock: Boolean(o.can_see_stock),
  };
}

export async function getRevenueSeries(months = 6): Promise<RevenuePoint[]> {
  if (isPreviewMode) return P.previewRevenueSeries(months);
  const rows = await rpc<any[]>("report_revenue_series", { p_months: months });
  return rows.map((r) => ({ month: r.month, revenue: n(r.revenue), orders: n(r.orders) }));
}

export async function getDailySales(days = 30): Promise<DailyPoint[]> {
  if (isPreviewMode) return P.previewDailySales(days);
  const rows = await rpc<any[]>("report_daily_sales", { p_days: days });
  return rows.map((r) => ({ day: r.day, revenue: n(r.revenue), orders: n(r.orders) }));
}

export async function getDivisionSales(days = 180): Promise<DivisionSales[]> {
  if (isPreviewMode) return P.previewDivisionSales(days);
  const rows = await rpc<any[]>("report_division_sales", { p_days: days });
  return rows.map((r) => ({ divisionId: r.division_id, name: r.name, accentColor: r.accent_color, revenue: n(r.revenue), units: n(r.units), orders: n(r.orders) }));
}

export async function getTopProducts(days = 90, limit = 8): Promise<TopProduct[]> {
  if (isPreviewMode) return P.previewTopProducts(days, limit);
  const rows = await rpc<any[]>("report_top_products", { p_days: days, p_limit: limit });
  return rows.map((r) => ({ productId: r.product_id, name: r.name, division: r.division, units: n(r.units), revenue: n(r.revenue) }));
}

export async function getOrderStatus(): Promise<StatusCount[]> {
  if (isPreviewMode) return P.previewOrderStatus();
  const rows = await rpc<any[]>("report_order_status", {});
  return rows.map((r) => ({ status: r.status, count: n(r.count) }));
}

export async function getAppointmentSeries(months = 6): Promise<AppointmentPoint[]> {
  if (isPreviewMode) return P.previewAppointmentSeries(months);
  const rows = await rpc<any[]>("report_appointment_series", { p_months: months });
  return rows.map((r) => ({ month: r.month, total: n(r.total), completed: n(r.completed), cancelled: n(r.cancelled), revenue: n(r.revenue) }));
}

export async function getServicePopularity(days = 180): Promise<ServicePopularity[]> {
  if (isPreviewMode) return P.previewServicePopularity(days);
  const rows = await rpc<any[]>("report_service_popularity", { p_days: days });
  return rows.map((r) => ({ serviceId: r.service_id, name: r.name, bookings: n(r.bookings), revenue: n(r.revenue) }));
}

export async function getCustomerGrowth(months = 6): Promise<CustomerGrowth[]> {
  if (isPreviewMode) return P.previewCustomerGrowth(months);
  const rows = await rpc<any[]>("report_customer_growth", { p_months: months });
  return rows.map((r) => ({ month: r.month, newCustomers: n(r.new_customers), total: n(r.total) }));
}

export async function getInventoryByDivision(): Promise<InventoryByDivision[]> {
  if (isPreviewMode) return P.previewInventoryByDivision();
  const rows = await rpc<any[]>("report_inventory_by_division", {});
  return rows.map((r) => ({
    divisionId: r.division_id,
    name: r.name,
    variants: n(r.variants),
    units: n(r.units),
    stockValue: n(r.stock_value),
    lowStock: n(r.low_stock),
    outOfStock: n(r.out_of_stock),
  }));
}

/** Run a report but degrade to a fallback (e.g. no permission) instead of crashing the page. */
export async function safe<T>(p: Promise<T>, fallback: T): Promise<T> {
  try {
    return await p;
  } catch (e) {
    console.error("[report]", (e as Error).message);
    return fallback;
  }
}
