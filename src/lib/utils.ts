import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { format } from "date-fns";
import { TZDate } from "@date-fns/tz";

/** Format a date in a given IANA timezone (default Asia/Kolkata). */
export function formatInTimeZone(value: string | Date | number, timeZone: string, pattern: string) {
  return format(new TZDate(new Date(value).getTime(), timeZone), pattern);
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const inr = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const inrCompact = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", notation: "compact", maximumFractionDigits: 1 });

export function formatINR(value: number | string | null | undefined) {
  const n = typeof value === "string" ? Number(value) : value ?? 0;
  return inr.format(Number.isFinite(n) ? n : 0);
}

export function formatINRCompact(value: number) {
  return inrCompact.format(value);
}

export const TIMEZONE = "Asia/Kolkata";



export function formatDate(value: string | Date, pattern = "d MMM yyyy") {
  return formatInTimeZone(value, TIMEZONE, pattern);
}

export function formatDateTime(value: string | Date) {
  return formatInTimeZone(value, TIMEZONE, "d MMM yyyy, h:mm a");
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("");
}

export function discountPercent(price: number, sale: number | null | undefined) {
  if (!sale || sale >= price) return 0;
  return Math.round(((price - sale) / price) * 100);
}

/** Map known Postgres error codes/messages to friendly copy */
export function friendlyDbError(message: string | undefined | null): string {
  const m = message ?? "";
  const table: Record<string, string> = {
    INSUFFICIENT_STOCK: "Some items in your bag just sold out or have fewer pieces left. Please review your bag.",
    ITEM_UNAVAILABLE: "An item in your bag is no longer available.",
    ITEM_NOT_FOUND: "An item in your bag could not be found.",
    INVALID_ADDRESS: "Please check your delivery address.",
    INVALID_COUPON: "That code is invalid or has expired.",
    COUPON_NOT_APPLICABLE: "That code doesn't apply to your bag.",
    AUTH_REQUIRED: "Please sign in to continue.",
    SLOT_TAKEN: "That time was just booked. Please choose another slot.",
    SLOT_BLOCKED: "That time is unavailable. Please choose another slot.",
    OUTSIDE_WORKING_HOURS: "That time is outside working hours for this specialist.",
    TOO_SOON: "Appointments need at least one hour's notice.",
    TOO_FAR_AHEAD: "Bookings open up to 90 days in advance.",
    STYLIST_DOES_NOT_OFFER_SERVICE: "This specialist doesn't offer that service.",
    TOO_LATE_TO_CANCEL: "Appointments can only be changed up to 4 hours before they start.",
    TOO_LATE_TO_RESCHEDULE: "Appointments can only be changed up to 4 hours before they start.",
    CANNOT_CANCEL: "This can no longer be cancelled.",
    FORBIDDEN: "You don't have permission to do that.",
    INVALID_TRANSITION: "That status change isn't allowed from the current status.",
    REFUND_REQUIRED: "This order has been paid — use Cancel & refund instead.",
    PAYMENT_NOT_CAPTURED: "Payment hasn't been captured for this order yet.",
    INVALID_EMAIL: "Please enter a valid email address.",
    INVALID_PHONE: "Please enter a valid phone number.",
    INVALID_NAME: "Please enter your full name.",
    INVALID_QUANTITY: "Please enter a valid quantity.",
    NOT_FOUND: "We couldn't find that record.",
  };
  for (const key of Object.keys(table)) if (m.includes(key)) return table[key];
  if (m.includes("row-level security") || m.includes("permission denied")) return "You don't have permission to do that.";
  if (m.includes("duplicate key")) return "A record with these details already exists.";
  return "Something went wrong. Please try again.";
}

export function absoluteUrl(path = "/") {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path.startsWith("/") ? path : `/${path}`}`;
}
