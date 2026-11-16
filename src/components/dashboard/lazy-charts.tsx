"use client";

import dynamic from "next/dynamic";

/** Recharts is only downloaded when an admin chart is on screen. */
function ChartSkeleton({ h = 220 }: { h?: number }) {
  return <div className="skeleton w-full" style={{ height: h }} aria-hidden />;
}

export const RevenueTrendChart = dynamic(() => import("./charts").then((m) => m.RevenueTrendChart), { ssr: false, loading: () => <ChartSkeleton h={260} /> });
export const DailyOrdersChart = dynamic(() => import("./charts").then((m) => m.DailyOrdersChart), { ssr: false, loading: () => <ChartSkeleton /> });
export const DivisionSalesChart = dynamic(() => import("./charts").then((m) => m.DivisionSalesChart), { ssr: false, loading: () => <ChartSkeleton /> });
export const TopProductsChart = dynamic(() => import("./charts").then((m) => m.TopProductsChart), { ssr: false, loading: () => <ChartSkeleton h={260} /> });
export const AppointmentTrendChart = dynamic(() => import("./charts").then((m) => m.AppointmentTrendChart), { ssr: false, loading: () => <ChartSkeleton h={240} /> });
export const CustomerGrowthChart = dynamic(() => import("./charts").then((m) => m.CustomerGrowthChart), { ssr: false, loading: () => <ChartSkeleton /> });
