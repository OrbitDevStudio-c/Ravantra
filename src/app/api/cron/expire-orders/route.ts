import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, serverEnv } from "@/lib/env";
import { createServiceSupabase } from "@/lib/supabase/server";

/** Releases stock held by unpaid orders (scheduled in vercel.json). */
export async function GET(req: NextRequest) {
  const { cronSecret, serviceRoleKey } = serverEnv();
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isSupabaseConfigured || !serviceRoleKey) return NextResponse.json({ ok: true, skipped: "not configured" });
  const { data, error } = await createServiceSupabase().rpc("expire_stale_orders", { p_minutes: 60 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, released: data });
}
