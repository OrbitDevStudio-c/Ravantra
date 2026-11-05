import "server-only";
import * as demo from "@/config/demo-data";
import { addDays, istToUtc, todayIst } from "@/features/salon/slots";
import type { ActivityRow, AdminAppointmentRow, AdminCustomerRow, AdminOrderDetail, InventoryRow, MovementRow } from "./types";

/**
 * Preview-mode adapters: turn the canonical demo dataset into the same shapes
 * the live Supabase queries return, so the admin is viewable with zero setup.
 */

const productMap = new Map(demo.products.map((p) => [p.id, p]));
const serviceMap = new Map(demo.services.map((s) => [s.id, s]));
const stylistMap = new Map(demo.stylists.map((s) => [s.id, s]));

function agoIso(days: number, hours = 0) {
  return new Date(Date.now() - days * 86400000 - hours * 3600000).toISOString();
}

let ordersCache: AdminOrderDetail[] | null = null;
export function previewOrders(): AdminOrderDetail[] {
  if (ordersCache) return ordersCache;
  ordersCache = demo.demoOrders
    .map((o) => {
      const c = demo.demoCustomers[o.customerIndex];
      const createdAt = agoIso(o.daysAgo, o.hour);
      const items = o.items.map((it) => {
        const p = productMap.get(it.productId)!;
        const v = p.variants.find((x) => x.id === it.variantId)!;
        return {
          id: it.id,
          productId: p.id,
          productName: p.name,
          variantName: v.name,
          sku: v.sku,
          image: p.images[0]?.url ?? null,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
          lineTotal: it.unitPrice * it.quantity,
          divisionId: p.divisionId,
        };
      });
      const history = [{ status: "pending", note: "Order placed (demo)", createdAt }];
      if (o.status !== "pending") history.push({ status: o.status, note: "Status (demo)", createdAt: agoIso(Math.max(0, o.daysAgo - 1), o.hour) });
      return {
        id: o.id,
        orderNumber: o.orderNumber,
        userId: c.id,
        customerName: c.fullName,
        customerEmail: c.email,
        customerPhone: c.phone,
        status: o.status,
        paymentStatus: o.paymentStatus,
        subtotal: o.subtotal,
        discountTotal: o.discount,
        shippingTotal: o.shipping,
        total: o.total,
        couponCode: o.couponCode,
        notes: null,
        shippingAddress: {
          full_name: c.address.fullName,
          phone: c.address.phone,
          line1: c.address.line1,
          line2: null,
          city: c.address.city,
          state: c.address.state,
          postal_code: c.address.postalCode,
          country: "India",
        },
        items,
        itemCount: items.reduce((a, i) => a + i.quantity, 0),
        divisions: [...new Set(items.map((i) => i.divisionId))],
        payment: {
          provider: "demo",
          providerOrderId: `demo_order_${o.orderNumber}`,
          providerPaymentId: o.paymentStatus === "successful" || o.paymentStatus === "refunded" ? `demo_pay_${o.orderNumber}` : null,
          amount: o.total,
          status: o.paymentStatus,
          method: "demo",
          failureReason: null,
          refundedAmount: o.paymentStatus === "refunded" ? o.total : 0,
          createdAt,
        },
        history,
        createdAt,
        isDemo: true,
        canManage: false,
      } satisfies AdminOrderDetail;
    })
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
  return ordersCache;
}

export function previewAppointments(): AdminAppointmentRow[] {
  const today = todayIst();
  return demo.demoAppointments
    .map((a) => {
      const c = demo.demoCustomers[a.customerIndex];
      const s = serviceMap.get(a.serviceId)!;
      const st = stylistMap.get(a.stylistId)!;
      const start = istToUtc(addDays(today, a.dayOffset), a.startTime);
      return {
        id: a.id,
        reference: a.reference,
        customerName: c.fullName,
        customerEmail: c.email,
        customerPhone: c.phone,
        customerId: c.id,
        serviceId: s.id,
        serviceName: s.name,
        durationMin: a.durationMin,
        stylistId: st.id,
        stylistName: st.name,
        startsAt: start.toISOString(),
        endsAt: new Date(start.getTime() + a.durationMin * 60000).toISOString(),
        status: a.status,
        price: a.price,
        notes: null,
        isDemo: true,
      };
    })
    .sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt));
}

export function previewCustomers(): AdminCustomerRow[] {
  const orders = previewOrders();
  const appts = previewAppointments();
  return demo.demoCustomers.map((c) => {
    const own = orders.filter((o) => o.userId === c.id);
    return {
      id: c.id,
      fullName: c.fullName,
      email: c.email,
      phone: c.phone,
      createdAt: agoIso(c.joinedDaysAgo),
      orders: own.length,
      spend: own.filter((o) => o.paymentStatus === "successful").reduce((a, o) => a + o.total, 0),
      appointments: appts.filter((a) => a.customerId === c.id).length,
      isDemo: true,
    };
  });
}

export function previewInventory(): InventoryRow[] {
  return demo.products.flatMap((p) =>
    p.variants.map((v) => ({
      variantId: v.id,
      sku: v.sku,
      variantName: v.name,
      productId: p.id,
      productName: p.name,
      productSlug: p.slug,
      divisionId: p.divisionId,
      quantity: v.stock,
      threshold: 3,
      isActive: v.isActive,
      image: p.images[0]?.url ?? null,
    })),
  );
}

export function previewMovements(): MovementRow[] {
  return demo.products
    .flatMap((p) =>
      p.variants.map((v) => ({
        id: `m-${v.id}`,
        variantId: v.id,
        sku: v.sku,
        productName: p.name,
        divisionId: p.divisionId,
        change: v.stock,
        quantityAfter: v.stock,
        reason: "initial",
        note: "Opening stock (demo)",
        actor: null,
        createdAt: agoIso(demo.productAgeDays[p.id] ?? 30),
      })),
    )
    .filter((m) => m.change > 0)
    .sort((a, b) => +new Date(b.createdAt) - +new Date(a.createdAt));
}

export function previewActivity(): ActivityRow[] {
  return [
    ["product.created", "Added Crystal Tennis Bracelet to Lifestyle (demo)", 2],
    ["product.created", "Added Petal Ruffle Organza Blouse to Fashion (demo)", 3],
    ["promotion.updated", "Updated The Festive Edit campaign (demo)", 4],
    ["inventory.adjusted", "Restocked Sienna Linen Shirt Dress (demo)", 5],
  ].map(([action, summary, d], i) => ({
    id: `a${i}`,
    action: String(action),
    summary: String(summary),
    actor: demo.adminUsers[0].name,
    createdAt: agoIso(Number(d)),
  }));
}
