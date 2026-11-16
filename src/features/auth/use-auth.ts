"use client";

import { useEffect, useSyncExternalStore } from "react";
import { usePathname } from "next/navigation";

/** The public slice of the signed-in user that client components need. */
export interface ClientUser {
  id: string;
  email: string | null;
  user_metadata: { full_name?: string | null; phone?: string | null };
}

/**
 * Tiny client-side auth store fed by /api/auth/me.
 * Re-checks on navigation (sign-in / sign-out happen in server actions that
 * redirect) and when the tab regains focus.
 */
let current: ClientUser | null = null;
let ready = false;
let inflight: Promise<void> | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function refresh() {
  if (inflight) return inflight;
  inflight = fetch("/api/auth/me", { cache: "no-store", credentials: "same-origin" })
    .then((r) => (r.ok ? r.json() : { user: null }))
    .then((j: { user: ClientUser | null }) => {
      const next = j.user ?? null;
      if (next?.id !== current?.id || !ready) {
        current = next;
        ready = true;
        emit();
      }
    })
    .catch(() => {
      ready = true;
      emit();
    })
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

if (typeof window !== "undefined") {
  window.addEventListener("focus", () => void refresh());
}

type Snapshot = { user: ClientUser | null; ready: boolean };
let snap: Snapshot = { user: null, ready: false };
const SERVER_SNAP: Snapshot = { user: null, ready: false };
function getSnap() {
  if (snap.user !== current || snap.ready !== ready) snap = { user: current, ready };
  return snap;
}

export function useAuthUser() {
  const pathname = usePathname();
  useEffect(() => {
    void refresh();
  }, [pathname]);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnap,
    () => SERVER_SNAP,
  );
}
