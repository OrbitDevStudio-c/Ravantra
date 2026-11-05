"use client";

import * as React from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal, X } from "lucide-react";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn, formatINR } from "@/lib/utils";

export interface FilterFacets {
  sizes: string[];
  colors: { name: string; hex: string | null }[];
  priceMin: number;
  priceMax: number;
}

export interface FilterOption {
  value: string;
  label: string;
  count?: number;
}

const SORTS = [
  ["featured", "Featured"],
  ["newest", "Newest"],
  ["price-asc", "Price: low to high"],
  ["price-desc", "Price: high to low"],
  ["rating", "Top rated"],
] as const;

function useQueryState() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, start] = React.useTransition();

  const set = React.useCallback(
    (patch: Record<string, string | string[] | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [k, v] of Object.entries(patch)) {
        if (v == null || (Array.isArray(v) && v.length === 0) || v === "") next.delete(k);
        else next.set(k, Array.isArray(v) ? v.join(",") : v);
      }
      const qs = next.toString();
      start(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
    },
    [params, pathname, router],
  );

  const list = (k: string) => (params.get(k) ?? "").split(",").filter(Boolean);
  return { params, set, list, pending };
}

export function SortSelect() {
  const { params, set } = useQueryState();
  return (
    <label className="flex items-center gap-3 text-xs">
      <span className="eyebrow hidden text-ink-mute sm:inline">Sort</span>
      <select
        value={params.get("sort") ?? "featured"}
        onChange={(e) => set({ sort: e.target.value === "featured" ? null : e.target.value })}
        className="cursor-pointer border-b border-line-strong bg-transparent py-1.5 pr-1 text-sm focus:outline-none"
        aria-label="Sort products"
      >
        {SORTS.map(([v, l]) => (
          <option key={v} value={v}>{l}</option>
        ))}
      </select>
    </label>
  );
}

function FilterGroups({ facets, categories, divisions }: { facets: FilterFacets; categories?: FilterOption[]; divisions?: FilterOption[] }) {
  const { params, set, list } = useQueryState();
  const sizes = list("size");
  const colors = list("color");
  const [min, setMin] = React.useState(params.get("min") ?? "");
  const [max, setMax] = React.useState(params.get("max") ?? "");

  const toggle = (key: string, current: string[], value: string) =>
    set({ [key]: current.includes(value) ? current.filter((x) => x !== value) : [...current, value] });

  return (
    <div className="divide-y divide-line">
      {divisions && divisions.length > 0 && (
        <Group title="Division">
          <ul className="space-y-2.5">
            {divisions.map((d) => (
              <li key={d.value}>
                <RadioRow active={params.get("division") === d.value} onClick={() => set({ division: params.get("division") === d.value ? null : d.value, category: null })} label={d.label} count={d.count} />
              </li>
            ))}
          </ul>
        </Group>
      )}
      {categories && categories.length > 0 && (
        <Group title="Category">
          <ul className="space-y-2.5">
            {categories.map((c) => (
              <li key={c.value}>
                <RadioRow active={params.get("category") === c.value} onClick={() => set({ category: params.get("category") === c.value ? null : c.value })} label={c.label} count={c.count} />
              </li>
            ))}
          </ul>
        </Group>
      )}
      {facets.sizes.length > 0 && (
        <Group title="Size">
          <div className="flex flex-wrap gap-1.5">
            {facets.sizes.map((s) => (
              <button
                key={s}
                onClick={() => toggle("size", sizes, s)}
                aria-pressed={sizes.includes(s)}
                className={cn(
                  "min-w-11 border px-2.5 py-2 text-xs transition",
                  sizes.includes(s) ? "border-espresso bg-espresso text-ivory" : "border-line-strong hover:border-espresso",
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </Group>
      )}
      {facets.colors.length > 0 && (
        <Group title="Colour">
          <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">
            {facets.colors.map((c) => (
              <button key={c.name} onClick={() => toggle("color", colors, c.name)} aria-pressed={colors.includes(c.name)} className="flex items-center gap-2.5 text-left text-sm">
                <span
                  className={cn("size-4 shrink-0 rounded-full border border-line ring-offset-2 ring-offset-ivory transition", colors.includes(c.name) && "ring-1 ring-espresso")}
                  style={{ backgroundColor: c.hex ?? "#ddd" }}
                />
                <span className={cn("truncate", colors.includes(c.name) ? "text-espresso" : "text-ink-soft")}>{c.name}</span>
              </button>
            ))}
          </div>
        </Group>
      )}
      <Group title="Price">
        <form
          className="flex items-end gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            set({ min: min || null, max: max || null });
          }}
        >
          <label className="flex-1">
            <span className="text-[0.65rem] text-ink-mute">Min ₹</span>
            <input inputMode="numeric" value={min} onChange={(e) => setMin(e.target.value.replace(/\D/g, ""))} placeholder={String(Math.floor(facets.priceMin))} className="field py-1.5" />
          </label>
          <span className="pb-2 text-ink-mute">–</span>
          <label className="flex-1">
            <span className="text-[0.65rem] text-ink-mute">Max ₹</span>
            <input inputMode="numeric" value={max} onChange={(e) => setMax(e.target.value.replace(/\D/g, ""))} placeholder={String(Math.ceil(facets.priceMax))} className="field py-1.5" />
          </label>
          <button className="pb-2 text-[0.68rem] uppercase tracking-[0.16em] underline-offset-4 hover:underline">Apply</button>
        </form>
        <p className="mt-2 text-[0.7rem] text-ink-mute">
          Range {formatINR(facets.priceMin)} – {formatINR(facets.priceMax)}
        </p>
      </Group>
      <Group title="Availability">
        <div className="space-y-2.5">
          <Check label="In stock only" checked={params.get("stock") === "1"} onChange={(v) => set({ stock: v ? "1" : null })} />
          <Check label="New arrivals" checked={params.get("new") === "1"} onChange={(v) => set({ new: v ? "1" : null })} />
          <Check label="On sale" checked={params.get("sale") === "1"} onChange={(v) => set({ sale: v ? "1" : null })} />
        </div>
      </Group>
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details open className="group py-5 first:pt-0">
      <summary className="flex cursor-pointer list-none items-center justify-between">
        <span className="eyebrow text-espresso">{title}</span>
        <span className="text-ink-mute transition-transform group-open:rotate-45">+</span>
      </summary>
      <div className="pt-4">{children}</div>
    </details>
  );
}

function RadioRow({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count?: number }) {
  return (
    <button onClick={onClick} aria-pressed={active} className="flex w-full items-center justify-between text-left text-sm">
      <span className={cn("transition", active ? "text-espresso underline underline-offset-4" : "text-ink-soft hover:text-espresso")}>{label}</span>
      {count != null && <span className="text-xs text-ink-mute tabular-nums">{count}</span>}
    </button>
  );
}

function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-3 text-sm text-ink-soft">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="size-3.5 accent-espresso" />
      {label}
    </label>
  );
}

export function ActiveFilters() {
  const { params, set, list } = useQueryState();
  const chips: { key: string; label: string; clear: () => void }[] = [];
  const q = params.get("q");
  if (q) chips.push({ key: "q", label: `“${q}”`, clear: () => set({ q: null }) });
  list("size").forEach((s) => chips.push({ key: `s-${s}`, label: `Size ${s}`, clear: () => set({ size: list("size").filter((x) => x !== s) }) }));
  list("color").forEach((c) => chips.push({ key: `c-${c}`, label: c, clear: () => set({ color: list("color").filter((x) => x !== c) }) }));
  if (params.get("min") || params.get("max"))
    chips.push({ key: "p", label: `${params.get("min") ? formatINR(Number(params.get("min"))) : "Any"} – ${params.get("max") ? formatINR(Number(params.get("max"))) : "Any"}`, clear: () => set({ min: null, max: null }) });
  if (params.get("stock")) chips.push({ key: "st", label: "In stock", clear: () => set({ stock: null }) });
  if (params.get("new")) chips.push({ key: "n", label: "New", clear: () => set({ new: null }) });
  if (params.get("sale")) chips.push({ key: "sa", label: "On sale", clear: () => set({ sale: null }) });
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-2">
      {chips.map((c) => (
        <button key={c.key} onClick={c.clear} className="inline-flex items-center gap-1.5 bg-champagne/70 px-3 py-1.5 text-xs transition hover:bg-champagne">
          {c.label} <X className="size-3" />
        </button>
      ))}
      <button onClick={() => set({ q: null, size: null, color: null, min: null, max: null, stock: null, new: null, sale: null })} className="text-xs text-ink-mute underline underline-offset-4">
        Clear all
      </button>
    </div>
  );
}

export function FiltersSidebar(props: { facets: FilterFacets; categories?: FilterOption[]; divisions?: FilterOption[] }) {
  return (
    <aside className="hidden lg:block" aria-label="Filters">
      <div className="sticky top-24 max-h-[calc(100vh-7rem)] overflow-y-auto pr-4 no-scrollbar">
        <FilterGroups {...props} />
      </div>
    </aside>
  );
}

export function FiltersSheetButton(props: { facets: FilterFacets; categories?: FilterOption[]; divisions?: FilterOption[]; total: number }) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <button className="inline-flex items-center gap-2 border border-line-strong px-4 py-2 text-[0.7rem] uppercase tracking-[0.16em] lg:hidden">
          <SlidersHorizontal className="size-3.5" strokeWidth={1.5} /> Filter
        </button>
      </SheetTrigger>
      <SheetContent side="left" title="Filters">
        <div className="flex h-full flex-col">
          <p className="px-6 pb-4 pt-6 font-serif text-3xl">Refine</p>
          <div className="flex-1 overflow-y-auto px-6">
            <FilterGroups {...props} />
          </div>
          <div className="border-t border-line p-4">
            <SheetClose asChild>
              <Button className="w-full">Show {props.total} results</Button>
            </SheetClose>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ListingPending({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
