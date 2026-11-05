/**
 * Slot generation for the booking flow (pure, shared by server & preview).
 * Asia/Kolkata is UTC+05:30 with no daylight saving, so conversion is exact.
 * The database re-validates every booking (_validate_slot + exclusion constraint).
 */
import type { WorkingHour } from "@/types";

export const IST_OFFSET_MIN = 330;
export const SLOT_STEP_MIN = 30;
export const LEAD_TIME_MIN = 60;
export const BOOKING_WINDOW_DAYS = 60;

/** "2026-11-12" + "10:30" (IST) → UTC Date */
export function istToUtc(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  return new Date(Date.UTC(y, m - 1, d, hh, mm) - IST_OFFSET_MIN * 60000);
}

/** UTC Date → { date: "yyyy-MM-dd", time: "HH:mm", weekday } in IST */
export function utcToIst(value: Date | string) {
  const t = new Date(new Date(value).getTime() + IST_OFFSET_MIN * 60000);
  const date = t.toISOString().slice(0, 10);
  const time = t.toISOString().slice(11, 16);
  return { date, time, weekday: t.getUTCDay() };
}

export function todayIst(now = new Date()) {
  return utcToIst(now).date;
}

export function addDays(date: string, n: number) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}

export function weekdayOf(date: string) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}

function toMin(t: string) {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}
function fromMin(n: number) {
  return `${String(Math.floor(n / 60)).padStart(2, "0")}:${String(n % 60).padStart(2, "0")}`;
}

export function label12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const suffix = h >= 12 ? "PM" : "AM";
  const hh = h % 12 === 0 ? 12 : h % 12;
  return `${hh}:${String(m).padStart(2, "0")} ${suffix}`;
}

export interface Slot {
  time: string;
  label: string;
  startsAt: string;
  available: boolean;
}

export function generateSlots(opts: {
  date: string;
  durationMin: number;
  workingHours: WorkingHour[];
  busy: { startsAt: string; endsAt: string }[];
  now?: Date;
}): Slot[] {
  const { date, durationMin, workingHours, busy } = opts;
  const now = opts.now ?? new Date();
  const wh = workingHours.find((w) => w.weekday === weekdayOf(date));
  if (!wh) return [];
  const open = toMin(wh.startTime);
  const close = toMin(wh.endTime);
  const earliest = now.getTime() + LEAD_TIME_MIN * 60000;
  const ranges = busy.map((b) => [new Date(b.startsAt).getTime(), new Date(b.endsAt).getTime()] as const);
  const slots: Slot[] = [];
  for (let m = open; m + durationMin <= close; m += SLOT_STEP_MIN) {
    const time = fromMin(m);
    const start = istToUtc(date, time).getTime();
    const end = start + durationMin * 60000;
    const clash = ranges.some(([s, e]) => s < end && e > start);
    slots.push({ time, label: label12(time), startsAt: new Date(start).toISOString(), available: !clash && start >= earliest });
  }
  return slots;
}
