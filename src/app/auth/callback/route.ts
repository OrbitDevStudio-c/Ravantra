import { NextResponse, type NextRequest } from "next/server";
import { createServerDb } from "@/lib/db/server";
import { isDatabaseConfigured } from "@/lib/env";

/** Redeems password-reset links (single-use, one-hour tokens) and signs the user in. */
export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const code = url.searchParams.get("code");
  const nextParam = url.searchParams.get("next") ?? "/account";
  const next = nextParam.startsWith("/") && !nextParam.startsWith("//") ? nextParam : "/account";

  if (code && isDatabaseConfigured) {
    const sb = await createServerDb();
    const { error } = await sb.auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, url.origin));
  }
  return NextResponse.redirect(new URL("/login?error=link", url.origin));
}
