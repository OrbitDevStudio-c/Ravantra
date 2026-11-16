import { PALETTE } from "@/config/site";
export interface Overview {
  revenue: number;
  revenuePrev: number;
  revenueAllTime: number;
  orders: number;
  ordersPrev: number;
  ordersAllTime: number;
  units: number;
  pendingOrders: number;
  customers: number;
  newCustomers: number;
  appointments: number;
  appointmentsUpcoming: number;
  appointmentRevenue: number;
  activeProducts: number;
  lowStock: number;
  canSeeSales: boolean;
  canSeeSalon: boolean;
  canSeeStock: boolean;
}

export interface RevenuePoint { month: string; revenue: number; orders: number }
export interface DailyPoint { day: string; revenue: number; orders: number }
export interface DivisionSales { divisionId: string; name: string; accentColor: string; revenue: number; units: number; orders: number }
export interface TopProduct { productId: string; name: string; division: string; units: number; revenue: number }
export interface StatusCount { status: string; count: number }
export interface AppointmentPoint { month: string; total: number; completed: number; cancelled: number; revenue: number }
export interface ServicePopularity { serviceId: string; name: string; bookings: number; revenue: number }
export interface CustomerGrowth { month: string; newCustomers: number; total: number }
export interface InventoryByDivision { divisionId: string; name: string; variants: number; units: number; stockValue: number; lowStock: number; outOfStock: number }

/**
 * Validated categorical palette (dataviz validator: lightness, chroma,
 * CVD ≥ 8 adjacent, normal-vision ≥ 15, contrast ≥ 3:1 on white).
 * Assigned in fixed order by entity (division sort order), never cycled.
 * Deliberately NOT the raw brand palette: RAVANTRA's muted tones fail the
 * categorical chroma/lightness checks, so these harmonised hues stand in for charts only.
 */
export const CHART_SERIES = ["#F0B9D3", "#AFCBFA", "#B49363", "#C8B8F0"] as const;
/** Chart ink drawn from the official palette (src/config/site.ts PALETTE). */
export const CHART_INK = { primary: "#FFFFFF", secondary: "#C3BCCF", muted: "#958DA3", grid: "#2E2636", single: "#C8B8F0", wash: PALETTE.gold };
