import "server-only";
import { can, type Access } from "@/lib/auth/permissions";
import {
  getAppointmentSeries,
  getDivisionSales,
  getInventoryByDivision,
  getOrderStatus,
  getOverview,
  getRevenueSeries,
  getServicePopularity,
  getTopProducts,
  safe,
} from "@/features/analytics/queries";
import { listOrders } from "@/features/admin/orders";
import { listLowStock } from "@/features/admin/inventory";

/**
 * Builds the business snapshot the AI assistant reasons over.
 * Every query runs as the signed-in staff member (role-scoped RPCs + RLS),
 * so the model only ever sees data that person is allowed to see.
 * Customer emails/phones are never included.
 */
export async function buildBusinessContext(access: Access) {
  const canOrders = can(access, "orders.view");
  const canStock = can(access, "inventory.manage") || can(access, "products.manage");

  const [overview, revenue, divisions, top, statuses, appts, services, inventory, recent, lowStock] = await Promise.all([
    safe(getOverview(30), null),
    safe(getRevenueSeries(6), []),
    safe(getDivisionSales(90), []),
    safe(getTopProducts(90, 8), []),
    safe(getOrderStatus(), []),
    safe(getAppointmentSeries(6), []),
    safe(getServicePopularity(90), []),
    canStock ? safe(getInventoryByDivision(), []) : Promise.resolve([]),
    canOrders ? safe(listOrders({ pageSize: 10 }), null) : Promise.resolve(null),
    canStock ? safe(listLowStock(10), []) : Promise.resolve([]),
  ]);

  const today = new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeZone: "Asia/Kolkata" }).format(new Date());

  return {
    generatedAt: today,
    currency: "INR",
    viewer: { role: access.roles.map((r) => r.name).join(", "), scope: access.isSuperAdmin ? "all divisions" : "divisions covered by this role" },
    overview30d: overview && {
      ...(overview.canSeeSales && {
        revenue: overview.revenue,
        revenuePrev30d: overview.revenuePrev,
        orders: overview.orders,
        ordersPrev30d: overview.ordersPrev,
        unitsSold: overview.units,
        pendingOrdersToFulfil: overview.pendingOrders,
        revenueAllTime: overview.revenueAllTime,
      }),
      customers: overview.customers,
      newCustomers: overview.newCustomers,
      ...(overview.canSeeSalon && {
        appointments30d: overview.appointments,
        appointmentsUpcoming: overview.appointmentsUpcoming,
        appointmentRevenue30d: overview.appointmentRevenue,
      }),
      ...(overview.canSeeStock && { activeProducts: overview.activeProducts, lowStockVariants: overview.lowStock }),
    },
    revenueByMonth: revenue,
    salesByDivision90d: divisions.map(({ name, revenue, units, orders }) => ({ name, revenue, units, orders })),
    topProducts90d: top.map(({ name, division, units, revenue }) => ({ name, division, units, revenue })),
    orderStatusCounts: statuses,
    appointmentsByMonth: appts,
    servicePopularity90d: services.map(({ name, bookings, revenue }) => ({ name, bookings, revenue })),
    inventoryByDivision: inventory.map(({ name, variants, units, stockValue, lowStock, outOfStock }) => ({ name, variants, units, stockValue, lowStock, outOfStock })),
    lowStockItems: lowStock.map((r) => ({ product: r.productName, variant: r.variantName, sku: r.sku, quantity: r.quantity })),
    recentOrders:
      recent?.rows.map((o) => ({
        orderNumber: o.orderNumber,
        customer: o.customerName,
        status: o.status,
        payment: o.paymentStatus,
        total: o.total,
        placedAt: o.createdAt,
        demo: o.isDemo,
      })) ?? [],
  };
}
