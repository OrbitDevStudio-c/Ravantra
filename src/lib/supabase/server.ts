import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { SUPABASE_ANON_KEY, SUPABASE_URL, isSupabaseConfigured, serverEnv } from "@/lib/env";

/**
 * Request-scoped client bound to the visitor's auth cookies.
 * All queries run as the signed-in user, so RLS applies.
 */
export async function createServerSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  const cookieStore = await cookies();
  return createServerClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Called from a Server Component — the proxy refreshes sessions instead.
        }
      },
    },
  });
}

/**
 * Cookie-less anonymous client for public catalogue reads.
 * Lets catalogue pages stay statically rendered / ISR cached.
 */
export function createPublicSupabase() {
  if (!isSupabaseConfigured) throw new Error("Supabase is not configured");
  return createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, next: { revalidate: 300, tags: ["catalog"] } }) },
  });
}

/**
 * Service-role client — bypasses RLS. Only for trusted server code paths
 * (payment verification, webhooks, refunds) AFTER explicit authorization.
 */
export function createServiceSupabase() {
  const { serviceRoleKey } = serverEnv();
  if (!isSupabaseConfigured || !serviceRoleKey) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY is required for this operation");
  }
  return createClient(SUPABASE_URL, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
