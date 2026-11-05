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
 */
export const CHART_SERIES = ["#9A3F72", "#A97A22", "#13866F", "#4458B0"] as const;
export const CHART_INK = { primary: "#211B20", secondary: "#5E5258", muted: "#8D8288", grid: "#ECE6DC", single: "#211B20", wash: "#B69A72" };
