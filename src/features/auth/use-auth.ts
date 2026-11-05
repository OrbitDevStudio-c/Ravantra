"use client";

import { useEffect, useSyncExternalStore } from "react";
import type { User } from "@supabase/supabase-js";
import { getBrowserSupabase } from "@/lib/supabase/client";

/** Tiny client-side auth store fed by Supabase's onAuthStateChange. */
let current: User | null = null;
let ready = false;
let started = false;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function start() {
  if (started) return;
  started = true;
  const sb = getBrowserSupabase();
  if (!sb) {
    ready = true;
    emit();
    return;
  }
  sb.auth.getUser().then(({ data }) => {
    current = data.user ?? null;
    ready = true;
    emit();
  });
  sb.auth.onAuthStateChange((_event, session) => {
    current = session?.user ?? null;
    ready = true;
    emit();
  });
}

type Snapshot = { user: User | null; ready: boolean };
let snap: Snapshot = { user: null, ready: false };
const SERVER_SNAP: Snapshot = { user: null, ready: false };
function getSnap() {
  if (snap.user !== current || snap.ready !== ready) snap = { user: current, ready };
  return snap;
}

export function useAuthUser() {
  useEffect(start, []);
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    getSnap,
    () => SERVER_SNAP,
  );
}
