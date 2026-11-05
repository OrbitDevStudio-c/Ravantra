"use client";

import * as React from "react";
import { getAvailability } from "@/features/appointments/actions";
import { addDays, todayIst, weekdayOf, type Slot } from "@/features/salon/slots";
import type { WorkingHour } from "@/types";
import { cn } from "@/lib/utils";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** Date strip (next 21 days) + live time slots for a stylist/service. */
export function SlotPicker({
  serviceId,
  stylistId,
  workingHours,
  value,
  onChange,
}: {
  serviceId: string;
  stylistId: string;
  workingHours: WorkingHour[];
  value: { date: string; slot: Slot | null };
  onChange: (v: { date: string; slot: Slot | null }) => void;
}) {
  const today = todayIst();
  const days = React.useMemo(() => Array.from({ length: 21 }, (_, i) => addDays(today, i)), [today]);
  const works = (d: string) => workingHours.some((w) => w.weekday === weekdayOf(d));
  const date = value.date;
  const reqKey = `${serviceId}|${stylistId}|${date}`;
  const [result, setResult] = React.useState<{ key: string; slots: Slot[] | null; error: string | null }>({ key: "", slots: null, error: null });

  React.useEffect(() => {
    if (!date) return;
    let alive = true;
    getAvailability({ serviceId, stylistId, date }).then((res) => {
      if (!alive) return;
      setResult({ key: reqKey, slots: res.ok ? res.data : null, error: res.ok ? null : res.error });
    });
    return () => {
      alive = false;
    };
  }, [serviceId, stylistId, date, reqKey]);

  const fresh = result.key === reqKey;
  const slots = fresh ? result.slots : null;
  const error = fresh ? result.error : null;

  const groups = (slots ?? []).reduce<Record<string, Slot[]>>((acc, s) => {
    const h = Number(s.time.slice(0, 2));
    const k = h < 12 ? "Morning" : h < 16 ? "Afternoon" : "Evening";
    (acc[k] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div>
      <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-2" role="listbox" aria-label="Choose a date">
        {days.map((d) => {
          const [, m, dd] = d.split("-").map(Number);
          const open = works(d);
          const active = d === date;
          return (
            <button
              key={d}
              role="option"
              aria-selected={active}
              disabled={!open}
              onClick={() => onChange({ date: d, slot: null })}
              className={cn(
                "flex w-16 shrink-0 flex-col items-center border py-3 transition",
                active ? "border-espresso bg-espresso text-ivory" : "border-line hover:border-espresso",
                !open && "cursor-not-allowed opacity-30 hover:border-line",
              )}
            >
              <span className="text-[0.6rem] uppercase tracking-[0.16em]">{DAYS[weekdayOf(d)]}</span>
              <span className="mt-1 font-serif text-2xl leading-none">{dd}</span>
              <span className="mt-1 text-[0.6rem] uppercase tracking-[0.12em] opacity-70">{MONTHS[m - 1]}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-8 min-h-40">
        {!date && <p className="text-sm text-ink-soft">Choose a date to see available times.</p>}
        {date && !slots && !error && (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">{Array.from({ length: 10 }).map((_, i) => <div key={i} className="skeleton h-11" />)}</div>
        )}
        {error && <p className="text-sm text-danger">{error}</p>}
        {slots && slots.filter((s) => s.available).length === 0 && (
          <p className="text-sm text-ink-soft">Fully booked on this day — please try another date or specialist.</p>
        )}
        {slots && slots.some((s) => s.available) && (
          <div className="space-y-6">
            {Object.entries(groups).map(([label, list]) => (
              <div key={label}>
                <p className="eyebrow mb-3 text-[0.62rem] text-ink-mute">{label}</p>
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                  {list.map((s) => (
                    <button
                      key={s.startsAt}
                      disabled={!s.available}
                      onClick={() => onChange({ date, slot: s })}
                      aria-pressed={value.slot?.startsAt === s.startsAt}
                      className={cn(
                        "h-11 border text-sm tabular-nums transition",
                        value.slot?.startsAt === s.startsAt ? "border-espresso bg-espresso text-ivory" : "border-line-strong hover:border-espresso",
                        !s.available && "cursor-not-allowed border-line text-ink-mute/60 line-through hover:border-line",
                      )}
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      <p className="mt-6 text-[0.7rem] text-ink-mute">All times are India Standard Time (IST). Bookings need at least 1 hour&apos;s notice.</p>
    </div>
  );
}
