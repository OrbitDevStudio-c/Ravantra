import "server-only";
import * as demo from "@/config/demo-data";
import { previewAppointments, previewCustomers, previewInventory, previewOrders } from "@/features/admin/preview-data";
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

/** Preview-mode analytics — same maths as supabase/migrations/*_reports.sql. */

const IST = 330 * 60000;
const istDate = (iso: string) => new Date(new Date(iso).getTime() + IST).toISOString().slice(0, 10);
const istMonth = (iso: string) => istDate(iso).slice(0, 7) + "-01";

function monthKeys(n: number) {
  const now = new Date(Date.now() + IST);
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1));
    out.push(d.toISOString().slice(0, 10));
  }
  return out;
}

const productDivisions = demo.divisions.filter((d) => d.kind === "products");

function paidLines() {
  return previewOrders()
    .filter((o) => o.paymentStatus === "successful" && o.status !== "cancelled" && o.status !== "refunded")
    .flatMap((o) => o.items.map((i) => ({ ...i, orderId: o.id, createdAt: o.createdAt })));
}

export function previewOverview(days: number): Overview {
  const from = Date.now() - days * 86400000;
  const prev = Date.now() - 2 * days * 86400000;
  const lines = paidLines();
  const inRange = lines.filter((l) => +new Date(l.createdAt) >= from);
  const inPrev = lines.filter((l) => +new Date(l.createdAt) >= prev && +new Date(l.createdAt) < from);
  const appts = previewAppointments();
  const customers = previewCustomers();
  const inventory = previewInventory();
  return {
    revenue: inRange.reduce((a, l) => a + l.lineTotal, 0),
    revenuePrev: inPrev.reduce((a, l) => a + l.lineTotal, 0),
    revenueAllTime: lines.reduce((a, l) => a + l.lineTotal, 0),
    orders: new Set(inRange.map((l) => l.orderId)).size,
    ordersPrev: new Set(inPrev.map((l) => l.orderId)).size,
    ordersAllTime: previewOrders().length,
    units: inRange.reduce((a, l) => a + l.quantity, 0),
    pendingOrders: previewOrders().filter((o) => ["pending", "confirmed", "processing"].includes(o.status)).length,
    customers: customers.length,
    newCustomers: customers.filter((c) => +new Date(c.createdAt) >= from).length,
    appointments: appts.filter((a) => +new Date(a.startsAt) >= from && +new Date(a.startsAt) <= Date.now()).length,
    appointmentsUpcoming: appts.filter((a) => +new Date(a.startsAt) > Date.now() && ["pending", "confirmed"].includes(a.status)).length,
    appointmentRevenue: appts.filter((a) => a.status === "completed" && +new Date(a.startsAt) >= from).reduce((s, a) => s + a.price, 0),
    activeProducts: demo.products.filter((p) => p.isActive).length,
    lowStock: inventory.filter((i) => i.isActive && i.quantity <= i.threshold).length,
    canSeeSales: true,
    canSeeSalon: true,
    canSeeStock: true,
  };
}

export function previewRevenueSeries(months: number): RevenuePoint[] {
  const lines = paidLines();
  return monthKeys(months).map((m) => {
    const ls = lines.filter((l) => istMonth(l.createdAt) === m);
    return { month: m, revenue: ls.reduce((a, l) => a + l.lineTotal, 0), orders: new Set(ls.map((l) => l.orderId)).size };
  });
}

export function previewDailySales(days: number): DailyPoint[] {
  const lines = paidLines();
  const out: DailyPoint[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const day = istDate(new Date(Date.now() - i * 86400000).toISOString());
    const ls = lines.filter((l) => istDate(l.createdAt) === day);
    out.push({ day, revenue: ls.reduce((a, l) => a + l.lineTotal, 0), orders: new Set(ls.map((l) => l.orderId)).size });
  }
  return out;
}

export function previewDivisionSales(days: number): DivisionSales[] {
  const from = Date.now() - days * 86400000;
  const lines = paidLines().filter((l) => +new Date(l.createdAt) >= from);
  return productDivisions.map((d) => {
    const ls = lines.filter((l) => l.divisionId === d.id);
    return {
      divisionId: d.id,
      name: d.shortName,
      accentColor: d.accentColor,
      revenue: ls.reduce((a, l) => a + l.lineTotal, 0),
      units: ls.reduce((a, l) => a + l.quantity, 0),
      orders: new Set(ls.map((l) => l.orderId)).size,
    };
  });
}

export function previewTopProducts(days: number, limit: number): TopProduct[] {
  const from = Date.now() - days * 86400000;
  const map = new Map<string, TopProduct>();
  for (const l of paidLines().filter((x) => +new Date(x.createdAt) >= from)) {
    const key = l.productId ?? l.productName;
    const div = demo.divisions.find((d) => d.id === l.divisionId)?.shortName ?? "";
    const cur = map.get(key) ?? { productId: key, name: l.productName, division: div, units: 0, revenue: 0 };
    cur.units += l.quantity;
    cur.revenue += l.lineTotal;
    map.set(key, cur);
  }
  return [...map.values()].sort((a, b) => b.revenue - a.revenue).slice(0, limit);
}

export function previewOrderStatus(): StatusCount[] {
  const counts = new Map<string, number>();
  previewOrders().forEach((o) => counts.set(o.status, (counts.get(o.status) ?? 0) + 1));
  return [...counts].map(([status, count]) => ({ status, count }));
}

export function previewAppointmentSeries(months: number): AppointmentPoint[] {
  const appts = previewAppointments();
  return monthKeys(months).map((m) => {
    const as = appts.filter((a) => istMonth(a.startsAt) === m);
    return {
      month: m,
      total: as.length,
      completed: as.filter((a) => a.status === "completed").length,
      cancelled: as.filter((a) => a.status === "cancelled" || a.status === "no_show").length,
      revenue: as.filter((a) => a.status === "completed").reduce((s, a) => s + a.price, 0),
    };
  });
}

export function previewServicePopularity(days: number): ServicePopularity[] {
  const from = Date.now() - days * 86400000;
  const appts = previewAppointments().filter((a) => +new Date(a.startsAt) >= from);
  return demo.services
    .map((s) => {
      const as = appts.filter((a) => a.serviceId === s.id);
      return { serviceId: s.id, name: s.name, bookings: as.length, revenue: as.filter((a) => a.status === "completed").reduce((x, a) => x + a.price, 0) };
    })
    .sort((a, b) => b.bookings - a.bookings);
}

export function previewCustomerGrowth(months: number): CustomerGrowth[] {
  const custs = previewCustomers().map((c) => istMonth(c.createdAt));
  return monthKeys(months).map((m) => ({
    month: m,
    newCustomers: custs.filter((c) => c === m).length,
    total: custs.filter((c) => c <= m).length,
  }));
}

export function previewInventoryByDivision(): InventoryByDivision[] {
  const inv = previewInventory();
  return productDivisions.map((d) => {
    const rows = inv.filter((r) => r.divisionId === d.id && r.isActive);
    const prices = new Map(demo.products.flatMap((p) => p.variants.map((v) => [v.id, v.price ?? p.price] as const)));
    return {
      divisionId: d.id,
      name: d.shortName,
      variants: rows.length,
      units: rows.reduce((a, r) => a + r.quantity, 0),
      stockValue: rows.reduce((a, r) => a + r.quantity * (prices.get(r.variantId) ?? 0), 0),
      lowStock: rows.filter((r) => r.quantity > 0 && r.quantity <= r.threshold).length,
      outOfStock: rows.filter((r) => r.quantity === 0).length,
    };
  });
}
