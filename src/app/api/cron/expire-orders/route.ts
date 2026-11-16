import { NextResponse, type NextRequest } from "next/server";
import { isDatabaseConfigured, serverEnv } from "@/lib/env";
import { createServiceDb } from "@/lib/db/server";

/** Releases stock held by unpaid orders (scheduled in vercel.json). */
export async function GET(req: NextRequest) {
  const { cronSecret } = serverEnv();
  if (!cronSecret || req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
  if (!isDatabaseConfigured) return NextResponse.json({ ok: true, skipped: "not configured" });
  const { data, error } = await createServiceDb().rpc("expire_stale_orders", { p_minutes: 60 });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, released: data });
}
