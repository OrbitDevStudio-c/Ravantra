"use client";

import { useEffect, useSyncExternalStore } from "react";
import { useAuthUser } from "@/features/auth/use-auth";
import { setWishlistItem, syncWishlist } from "./actions";

const KEY = "ravantra.wishlist.v1";
const EMPTY: string[] = [];
let cache: string[] | null = null;
let signedIn = false;
const listeners = new Set<() => void>();

function read() {
  if (typeof window === "undefined") return EMPTY;
  if (cache) return cache;
  try {
    cache = JSON.parse(window.localStorage.getItem(KEY) ?? "[]");
    if (!Array.isArray(cache)) cache = [];
  } catch {
    cache = [];
  }
  return cache!;
}
function write(ids: string[]) {
  cache = ids;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(ids));
  } catch {}
  listeners.forEach((l) => l());
}

export const wishlist = {
  has: (id: string) => read().includes(id),
  toggle(id: string) {
    const next = read().includes(id) ? read().filter((x) => x !== id) : [id, ...read()];
    const saved = next.includes(id);
    write(next);
    if (signedIn) void setWishlistItem(id, saved);
    return saved;
  },
};

let lastSyncedUser: string | null = null;

/** Mount once (in Providers) to merge the local wishlist on sign-in. */
export function useWishlistSync() {
  const { user } = useAuthUser();
  useEffect(() => {
    signedIn = Boolean(user);
    if (!user || lastSyncedUser === user.id) return;
    lastSyncedUser = user.id;
    syncWishlist(read()).then((ids) => {
      if (ids) write(ids);
    });
  }, [user]);
}

export function useWishlist() {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => EMPTY,
  );
}
