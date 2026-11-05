import * as React from "react";
import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Badge } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
  eyebrow,
  back,
}: {
  title: string;
  description?: React.ReactNode;
  actions?: React.ReactNode;
  eyebrow?: string;
  back?: { href: string; label: string };
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
      <div>
        {back && (
          <Link href={back.href} className="mb-3 inline-flex items-center gap-1 text-xs text-ink-mute hover:text-espresso">
            ← {back.label}
          </Link>
        )}
        {eyebrow && <p className="eyebrow mb-2 text-mocha">{eyebrow}</p>}
        <h1 className="font-serif text-[2rem] leading-none text-espresso md:text-[2.4rem]">{title}</h1>
        {description && <p className="mt-2 max-w-2xl text-sm text-ink-soft">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

export function Panel({ title, action, children, className, padded = true }: { title?: string; action?: React.ReactNode; children: React.ReactNode; className?: string; padded?: boolean }) {
  return (
    <section className={cn("border border-line bg-white", className)}>
      {(title || action) && (
        <header className="flex items-center justify-between gap-3 border-b border-line px-5 py-3.5">
          {title && <h2 className="font-serif text-lg text-espresso">{title}</h2>}
          {action}
        </header>
      )}
      <div className={cn(padded && "p-5")}>{children}</div>
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  delta,
  href,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  delta?: number | null;
  href?: string;
  tone?: "warning" | "default";
}) {
  const body = (
    <div className={cn("h-full border border-line bg-white p-5 transition-colors", href && "hover:border-line-strong", tone === "warning" && "border-l-2 border-l-warning")}>
      <p className="eyebrow text-[0.6rem] text-ink-mute">{label}</p>
      <p className="mt-3 font-serif text-[2rem] leading-none tabular-nums text-espresso">{value}</p>
      <div className="mt-2 flex items-center gap-2 text-xs text-ink-mute">
        {typeof delta === "number" && Number.isFinite(delta) && (
          <span className={cn("inline-flex items-center gap-0.5 tabular-nums", delta >= 0 ? "text-success" : "text-danger")}>
            {delta >= 0 ? <ArrowUpRight className="size-3" /> : <ArrowDownRight className="size-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
        {hint && <span>{hint}</span>}
      </div>
    </div>
  );
  return href ? <Link href={href} className="block h-full">{body}</Link> : body;
}

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={cn("overflow-x-auto border border-line bg-white", className)}>
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}
export function THead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="border-b border-line bg-ivory-2/60 text-[0.62rem] uppercase tracking-[0.14em] text-ink-mute">
      <tr>{children}</tr>
    </thead>
  );
}
export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("whitespace-nowrap px-4 py-2.5 font-medium", className)}>{children}</th>;
}
export function Td({ children, className, colSpan }: { children?: React.ReactNode; className?: string; colSpan?: number }) {
  return <td colSpan={colSpan} className={cn("px-4 py-3 align-middle", className)}>{children}</td>;
}
export function Tr({ children, className }: { children: React.ReactNode; className?: string }) {
  return <tr className={cn("border-b border-line/70 last:border-0 hover:bg-ivory/60", className)}>{children}</tr>;
}
export function EmptyRow({ colSpan, children = "Nothing here yet." }: { colSpan: number; children?: React.ReactNode }) {
  return (
    <tr>
      <td colSpan={colSpan} className="px-4 py-14 text-center text-sm text-ink-mute">{children}</td>
    </tr>
  );
}

const STATUS_TONE: Record<string, "neutral" | "gold" | "dark" | "success" | "danger" | "warning" | "outline" | "info"> = {
  pending: "warning",
  confirmed: "info",
  processing: "gold",
  shipped: "gold",
  delivered: "success",
  completed: "success",
  successful: "success",
  cancelled: "danger",
  failed: "danger",
  refunded: "outline",
  no_show: "danger",
  active: "success",
  inactive: "outline",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge tone={STATUS_TONE[status] ?? "neutral"} className={className}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}

export function DemoBadge() {
  return <Badge tone="outline" className="ml-1.5 !px-1 !py-0 !text-[0.55rem]">Demo</Badge>;
}

export function Pagination({ page, pageSize, total, basePath, params }: { page: number; pageSize: number; total: number; basePath: string; params: Record<string, string | undefined> }) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return <p className="mt-3 text-xs text-ink-mute">{total} result{total === 1 ? "" : "s"}</p>;
  const href = (p: number) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => v && k !== "page" && sp.set(k, v));
    if (p > 1) sp.set("page", String(p));
    const s = sp.toString();
    return s ? `${basePath}?${s}` : basePath;
  };
  return (
    <div className="mt-3 flex items-center justify-between text-xs text-ink-mute">
      <span>
        {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
      </span>
      <div className="flex gap-1">
        {page > 1 ? <Link href={href(page - 1)} className="border border-line bg-white px-3 py-1.5 hover:border-espresso">Previous</Link> : <span className="border border-line px-3 py-1.5 opacity-40">Previous</span>}
        <span className="px-3 py-1.5 tabular-nums">{page} / {pages}</span>
        {page < pages ? <Link href={href(page + 1)} className="border border-line bg-white px-3 py-1.5 hover:border-espresso">Next</Link> : <span className="border border-line px-3 py-1.5 opacity-40">Next</span>}
      </div>
    </div>
  );
}

export function Tabs({ tabs, active }: { tabs: { href: string; label: string; key: string; count?: number }[]; active: string }) {
  return (
    <nav className="mb-5 flex gap-6 overflow-x-auto border-b border-line" aria-label="Sections">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          aria-current={t.key === active ? "page" : undefined}
          className={cn(
            "-mb-px whitespace-nowrap border-b-2 pb-2.5 text-[0.78rem] uppercase tracking-[0.12em] transition-colors",
            t.key === active ? "border-espresso text-espresso" : "border-transparent text-ink-mute hover:text-espresso",
          )}
        >
          {t.label}
          {typeof t.count === "number" && <span className="ml-1.5 text-ink-mute">{t.count}</span>}
        </Link>
      ))}
    </nav>
  );
}

export function KeyValue({ items }: { items: [string, React.ReactNode][] }) {
  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
      {items.map(([k, v]) => (
        <React.Fragment key={k}>
          <dt className="text-ink-mute">{k}</dt>
          <dd className="text-espresso">{v}</dd>
        </React.Fragment>
      ))}
    </dl>
  );
}

export function Denied({ perm }: { perm: string }) {
  return (
    <div className="border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
      Your role doesn&apos;t include <code className="font-mono text-xs">{perm}</code>. Ask a super admin for access.
    </div>
  );
}
