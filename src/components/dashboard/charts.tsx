"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CHART_INK, CHART_SERIES } from "@/features/analytics/types";

/* Mark specs (dataviz skill): 2px lines, ≤24px bars with 4px rounded data-end,
   hairline solid grid, recessive axes, hover tooltip on every chart. */

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const monthLabel = (iso: string) => MONTHS[Number(iso.slice(5, 7)) - 1] ?? iso;
const dayLabel = (iso: string) => `${Number(iso.slice(8, 10))} ${monthLabel(iso)}`;

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const compact = (v: number) => (Math.abs(v) >= 1000 ? `₹${new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 }).format(v)}` : `₹${v}`);
const int = new Intl.NumberFormat("en-IN");

const axis = { stroke: CHART_INK.muted, fontSize: 11, tickLine: false, axisLine: false } as const;

type TipRow = { label: string; value: string; color?: string };
function Tip({ title, rows }: { title: string; rows: TipRow[] }) {
  return (
    <div className="min-w-36 border border-line bg-white px-3 py-2 text-xs shadow-[0_8px_30px_-12px_rgba(33,27,32,0.3)]">
      <p className="mb-1 font-medium text-espresso">{title}</p>
      {rows.map((r) => (
        <p key={r.label} className="flex items-center justify-between gap-4 text-ink-soft">
          <span className="flex items-center gap-1.5">
            {r.color && <span className="size-2 rounded-full" style={{ background: r.color }} />}
            {r.label}
          </span>
          <span className="tabular-nums text-espresso">{r.value}</span>
        </p>
      ))}
    </div>
  );
}

/* eslint-disable @typescript-eslint/no-explicit-any */
const tipContent = (render: (p: any) => { title: string; rows: TipRow[] } | null) =>
  function TipContent({ active, payload }: any) {
    if (!active || !payload?.length) return null;
    const r = render(payload[0].payload);
    return r ? <Tip {...r} /> : null;
  };

export function RevenueTrendChart({ data, height = 260 }: { data: { month: string; revenue: number; orders: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={CHART_INK.single} stopOpacity={0.12} />
            <stop offset="100%" stopColor={CHART_INK.single} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
        <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
        <YAxis tickFormatter={compact} width={56} {...axis} />
        <Tooltip
          cursor={{ stroke: CHART_INK.muted, strokeWidth: 1 }}
          content={tipContent((p) => ({ title: monthLabel(p.month), rows: [{ label: "Revenue", value: inr.format(p.revenue) }, { label: "Orders", value: int.format(p.orders) }] }))}
        />
        <Area type="monotone" dataKey="revenue" stroke={CHART_INK.single} strokeWidth={2} fill="url(#rev)" dot={false} activeDot={{ r: 4, strokeWidth: 2, stroke: "#fff" }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DailyOrdersChart({ data, height = 220 }: { data: { day: string; revenue: number; orders: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
        <XAxis dataKey="day" tickFormatter={dayLabel} interval={6} {...axis} />
        <YAxis allowDecimals={false} width={36} {...axis} />
        <Tooltip
          cursor={{ fill: "rgba(33,27,32,0.04)" }}
          content={tipContent((p) => ({ title: dayLabel(p.day), rows: [{ label: "Orders", value: int.format(p.orders) }, { label: "Revenue", value: inr.format(p.revenue) }] }))}
        />
        <Bar dataKey="orders" fill={CHART_INK.single} radius={[4, 4, 0, 0]} maxBarSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function DivisionSalesChart({ data, height = 220 }: { data: { name: string; revenue: number; units: number; orders: number }[]; height?: number }) {
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={data} layout="vertical" margin={{ top: 4, right: 56, left: 8, bottom: 4 }}>
          <CartesianGrid horizontal={false} stroke={CHART_INK.grid} />
          <XAxis type="number" tickFormatter={compact} {...axis} />
          <YAxis type="category" dataKey="name" width={96} {...axis} tick={{ fill: CHART_INK.secondary, fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "rgba(33,27,32,0.04)" }}
            content={tipContent((p) => ({
              title: p.name,
              rows: [
                { label: "Revenue", value: inr.format(p.revenue) },
                { label: "Units", value: int.format(p.units) },
                { label: "Orders", value: int.format(p.orders) },
              ],
            }))}
          />
          <Bar dataKey="revenue" radius={[0, 4, 4, 0]} maxBarSize={22} label={{ position: "right", formatter: (v: any) => compact(Number(v)), fill: CHART_INK.secondary, fontSize: 11 }}>
            {data.map((_, i) => (
              <Cell key={i} fill={CHART_SERIES[i % CHART_SERIES.length]} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <Legend items={data.map((d, i) => ({ label: d.name, color: CHART_SERIES[i % CHART_SERIES.length] }))} />
    </div>
  );
}

export function TopProductsChart({ data, height }: { data: { name: string; division: string; units: number; revenue: number }[]; height?: number }) {
  const h = height ?? Math.max(160, data.length * 34);
  return (
    <ResponsiveContainer width="100%" height={h}>
      <BarChart data={data} layout="vertical" margin={{ top: 0, right: 56, left: 8, bottom: 0 }}>
        <XAxis type="number" hide />
        <YAxis type="category" dataKey="name" width={170} {...axis} tick={{ fill: CHART_INK.secondary, fontSize: 11 }} tickFormatter={(v: string) => (v.length > 26 ? v.slice(0, 25) + "…" : v)} />
        <Tooltip
          cursor={{ fill: "rgba(33,27,32,0.04)" }}
          content={tipContent((p) => ({ title: p.name, rows: [{ label: "Division", value: p.division }, { label: "Units", value: int.format(p.units) }, { label: "Revenue", value: inr.format(p.revenue) }] }))}
        />
        <Bar dataKey="revenue" fill={CHART_INK.single} radius={[0, 4, 4, 0]} maxBarSize={16} label={{ position: "right", formatter: (v: any) => compact(Number(v)), fill: CHART_INK.secondary, fontSize: 11 }} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function AppointmentTrendChart({ data, height = 240 }: { data: { month: string; total: number; completed: number; cancelled: number; revenue: number }[]; height?: number }) {
  const rows = data.map((d) => ({ ...d, other: Math.max(0, d.total - d.completed - d.cancelled) }));
  const series = [
    { key: "completed", label: "Completed", color: CHART_SERIES[2] },
    { key: "other", label: "Upcoming / pending", color: CHART_SERIES[1] },
    { key: "cancelled", label: "Cancelled / no-show", color: CHART_SERIES[0] },
  ];
  return (
    <div>
      <ResponsiveContainer width="100%" height={height}>
        <BarChart data={rows} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
          <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
          <YAxis allowDecimals={false} width={36} {...axis} />
          <Tooltip
            cursor={{ fill: "rgba(33,27,32,0.04)" }}
            content={tipContent((p) => ({
              title: monthLabel(p.month),
              rows: [
                ...series.map((s) => ({ label: s.label, value: int.format(p[s.key]), color: s.color })),
                { label: "Completed revenue", value: inr.format(p.revenue) },
              ],
            }))}
          />
          {series.map((s, i) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              stackId="a"
              fill={s.color}
              maxBarSize={24}
              stroke="#fff"
              strokeWidth={2}
              radius={i === series.length - 1 ? [4, 4, 0, 0] : 0}
            />
          ))}
        </BarChart>
      </ResponsiveContainer>
      <Legend items={series.map((s) => ({ label: s.label, color: s.color }))} />
    </div>
  );
}

export function CustomerGrowthChart({ data, height = 220 }: { data: { month: string; newCustomers: number; total: number }[]; height?: number }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 16, left: -12, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={CHART_INK.grid} />
        <XAxis dataKey="month" tickFormatter={monthLabel} {...axis} />
        <YAxis allowDecimals={false} width={36} {...axis} />
        <Tooltip
          cursor={{ stroke: CHART_INK.muted, strokeWidth: 1 }}
          content={tipContent((p) => ({ title: monthLabel(p.month), rows: [{ label: "Total customers", value: int.format(p.total) }, { label: "New this month", value: int.format(p.newCustomers) }] }))}
        />
        <Line type="monotone" dataKey="total" stroke={CHART_INK.single} strokeWidth={2} dot={{ r: 4, strokeWidth: 2, stroke: "#fff", fill: CHART_INK.single }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function Legend({ items }: { items: { label: string; color: string }[] }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-ink-soft">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-[2px]" style={{ background: i.color }} aria-hidden />
          {i.label}
        </li>
      ))}
    </ul>
  );
}
