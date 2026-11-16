"use client";

import { useSyncExternalStore } from "react";

/**
 * Cart state lives in localStorage (works for guests, zero network).
 * The snapshot fields are for display only — the server re-prices every
 * line from the database (quote_cart / place_order) before payment.
 */
export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  variantLabel: string;
  image: string;
  unitPrice: number;
  compareAt: number | null;
  quantity: number;
  maxQty: number;
  division: string;
}

const KEY = "ravantra.cart.v1";
const MAX_PER_LINE = 10;
const EMPTY: CartItem[] = [];

let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function read(): CartItem[] {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as CartItem[]) : [];
    cache = Array.isArray(parsed) ? parsed.filter((i) => i && i.variantId && i.quantity > 0) : [];
  } catch {
    cache = [];
  }
  return cache;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable (private mode) — keep in memory */
  }
  listeners.forEach((l) => l());
}

if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === KEY) {
      cache = null;
      listeners.forEach((l) => l());
    }
  });
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export const cart = {
  get: read,
  add(item: Omit<CartItem, "quantity">, quantity = 1) {
    const items = [...read()];
    const idx = items.findIndex((i) => i.variantId === item.variantId);
    const cap = Math.min(MAX_PER_LINE, Math.max(item.maxQty, 0));
    if (idx >= 0) {
      items[idx] = { ...items[idx], ...item, quantity: Math.min(cap, items[idx].quantity + quantity) };
    } else {
      items.unshift({ ...item, quantity: Math.min(cap, quantity) });
    }
    write(items);
  },
  setQuantity(variantId: string, quantity: number) {
    const items = read()
      .map((i) => (i.variantId === variantId ? { ...i, quantity: Math.max(0, Math.min(MAX_PER_LINE, i.maxQty, quantity)) } : i))
      .filter((i) => i.quantity > 0);
    write(items);
  },
  /** Apply server-confirmed prices/stock to the display snapshot */
  reconcile(updates: { variantId: string; unitPrice: number; stock: number }[]) {
    const map = new Map(updates.map((u) => [u.variantId, u]));
    let changed = false;
    const items = read().map((i) => {
      const u = map.get(i.variantId);
      if (!u) return i;
      if (u.unitPrice !== i.unitPrice || u.stock !== i.maxQty) {
        changed = true;
        return { ...i, unitPrice: u.unitPrice, maxQty: u.stock, quantity: Math.min(i.quantity, Math.max(u.stock, 0)) || i.quantity };
      }
      return i;
    });
    if (changed) write(items);
  },
  remove(variantId: string) {
    write(read().filter((i) => i.variantId !== variantId));
  },
  clear() {
    write([]);
  },
};

export function useCart() {
  const items = useSyncExternalStore(subscribe, read, () => EMPTY);
  const count = items.reduce((a, i) => a + i.quantity, 0);
  const subtotal = items.reduce((a, i) => a + i.unitPrice * i.quantity, 0);
  return { items, count, subtotal };
}

/* ---------------- Drawer open state ---------------- */
let drawerOpen = false;
const drawerListeners = new Set<() => void>();
export const cartDrawer = {
  open() {
    drawerOpen = true;
    drawerListeners.forEach((l) => l());
  },
  set(v: boolean) {
    drawerOpen = v;
    drawerListeners.forEach((l) => l());
  },
};
export function useCartDrawer() {
  return useSyncExternalStore(
    (cb) => {
      drawerListeners.add(cb);
      return () => drawerListeners.delete(cb);
    },
    () => drawerOpen,
    () => false,
  );
}
