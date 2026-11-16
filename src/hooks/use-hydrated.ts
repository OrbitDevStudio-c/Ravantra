"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/** true after hydration on the client, false during SSR — without effects. */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Read a sessionStorage value once on the client (safe in private mode). */
export function readSession(key: string, fallback = "") {
  try {
    return sessionStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
