export type AdminResult<T = undefined> =
  | { ok: true; data?: T }
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };

export interface Paged<T> {
  rows: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface AdminOrderRow {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: string;
  paymentStatus: string;
  total: number;
  itemCount: number;
  divisions: string[];
  createdAt: string;
  isDemo: boolean;
}

export interface AdminOrderDetail extends AdminOrderRow {
  userId: string;
  customerPhone: string | null;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  couponCode: string | null;
  notes: string | null;
  shippingAddress: Record<string, string | null>;
  items: {
    id: string;
    productId: string | null;
    productName: string;
    variantName: string | null;
    sku: string;
    image: string | null;
    unitPrice: number;
    quantity: number;
    lineTotal: number;
    divisionId: string;
  }[];
  payment: {
    provider: string;
    providerOrderId: string | null;
    providerPaymentId: string | null;
    amount: number;
    status: string;
    method: string | null;
    failureReason: string | null;
    refundedAmount: number;
    createdAt: string;
  } | null;
  history: { status: string; note: string | null; createdAt: string }[];
  canManage: boolean;
}

export interface AdminAppointmentRow {
  id: string;
  reference: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  customerId: string | null;
  serviceId: string;
  serviceName: string;
  durationMin: number;
  stylistId: string;
  stylistName: string;
  startsAt: string;
  endsAt: string;
  status: string;
  price: number;
  notes: string | null;
  isDemo: boolean;
}

export interface AdminCustomerRow {
  id: string;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  orders: number;
  spend: number;
  appointments: number;
  isDemo: boolean;
}

export interface InventoryRow {
  variantId: string;
  sku: string;
  variantName: string;
  productId: string;
  productName: string;
  productSlug: string;
  divisionId: string;
  quantity: number;
  threshold: number;
  isActive: boolean;
  image: string | null;
}

export interface MovementRow {
  id: string;
  variantId: string;
  sku: string;
  productName: string;
  divisionId: string | null;
  change: number;
  quantityAfter: number;
  reason: string;
  note: string | null;
  actor: string | null;
  createdAt: string;
}

export interface ActivityRow {
  id: string;
  action: string;
  summary: string;
  actor: string | null;
  createdAt: string;
}
