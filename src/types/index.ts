/* Shared domain types — mirrors supabase/migrations schema (camelCased). */

export type UUID = string;

export interface Division {
  id: UUID;
  slug: string;
  name: string;
  shortName: string;
  tagline: string;
  description: string;
  accentColor: string;
  heroImage: string;
  bannerImage: string;
  logoUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  /** "products" divisions sell shippable goods, "services" divisions take appointments. */
  kind: "products" | "services";
}

export interface Category {
  id: UUID;
  divisionId: UUID;
  slug: string;
  name: string;
  description: string | null;
  image: string | null;
  sortOrder: number;
  isFeatured: boolean;
}

export interface ProductImage {
  id: UUID;
  url: string;
  alt: string;
  sortOrder: number;
}

export interface ProductVariant {
  id: UUID;
  productId: UUID;
  sku: string;
  name: string;
  size: string | null;
  color: string | null;
  colorHex: string | null;
  volume: string | null;
  /** Overrides product price when set */
  price: number | null;
  salePrice: number | null;
  stock: number;
  isActive: boolean;
}

export interface Product {
  id: UUID;
  slug: string;
  name: string;
  divisionId: UUID;
  categoryId: UUID;
  sku: string;
  shortDescription: string;
  description: string;
  price: number;
  salePrice: number | null;
  ingredients: string | null;
  highlights: string[];
  tags: string[];
  isFeatured: boolean;
  isNew: boolean;
  isActive: boolean;
  ratingAvg: number;
  ratingCount: number;
  createdAt: string;
  images: ProductImage[];
  variants: ProductVariant[];
}

export interface ProductWithRelations extends Product {
  division: Pick<Division, "id" | "slug" | "name" | "shortName" | "accentColor">;
  category: Pick<Category, "id" | "slug" | "name">;
}

export interface Review {
  id: UUID;
  productId: UUID;
  authorName: string;
  rating: number;
  title: string;
  body: string;
  isDemo: boolean;
  createdAt: string;
}

export interface Service {
  id: UUID;
  slug: string;
  category: string;
  name: string;
  description: string;
  durationMin: number;
  price: number;
  image: string;
  isPopular: boolean;
  isActive: boolean;
}

export interface WorkingHour {
  weekday: number; // 0 = Sunday
  startTime: string; // "10:00"
  endTime: string; // "19:00"
}

export interface Stylist {
  id: UUID;
  slug: string;
  name: string;
  title: string;
  bio: string;
  image: string;
  specialties: string[];
  experienceYears: number;
  isActive: boolean;
  serviceIds: UUID[];
  workingHours: WorkingHour[];
}

export interface BlockedSlot {
  id: UUID;
  stylistId: UUID;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

export interface Promotion {
  id: UUID;
  title: string;
  subtitle: string;
  eyebrow: string;
  ctaLabel: string;
  ctaHref: string;
  image: string;
  placement: "home_banner" | "home_strip" | "division_banner";
  divisionId: UUID | null;
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  sortOrder: number;
}

export interface Coupon {
  id: UUID;
  code: string;
  description: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  minSubtotal: number;
  maxDiscount: number | null;
  divisionId: UUID | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
}

export type OrderStatus =
  | "pending"
  | "confirmed"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded";

export type PaymentStatus = "pending" | "successful" | "failed" | "refunded";

export type AppointmentStatus = "pending" | "confirmed" | "completed" | "cancelled" | "no_show";

export interface Address {
  id?: UUID;
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country?: string;
  isDefault?: boolean;
}

export interface OrderItem {
  id: UUID;
  productId: UUID | null;
  variantId: UUID | null;
  divisionId: UUID;
  productName: string;
  variantName: string | null;
  sku: string;
  image: string | null;
  unitPrice: number;
  quantity: number;
  lineTotal: number;
}

export interface Order {
  id: UUID;
  orderNumber: string;
  userId: UUID;
  customerName: string;
  customerEmail: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  subtotal: number;
  discountTotal: number;
  shippingTotal: number;
  total: number;
  couponCode: string | null;
  shippingAddress: Address;
  items: OrderItem[];
  createdAt: string;
  isDemo: boolean;
}

export interface Appointment {
  id: UUID;
  reference: string;
  customerId: UUID | null;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  serviceId: UUID;
  stylistId: UUID;
  startsAt: string;
  endsAt: string;
  status: AppointmentStatus;
  price: number;
  notes: string | null;
  createdAt: string;
  isDemo: boolean;
}

export interface CustomerProfile {
  id: UUID;
  fullName: string;
  email: string;
  phone: string | null;
  createdAt: string;
  isDemo: boolean;
}

export type CartLine = {
  productId: UUID;
  variantId: UUID;
  quantity: number;
};

export type ActionResult<T = undefined> =
  | ({ ok: true } & (T extends undefined ? { data?: undefined } : { data: T }))
  | { ok: false; error: string; fieldErrors?: Record<string, string[] | undefined> };
