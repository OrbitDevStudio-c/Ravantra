import { NextResponse } from "next/server";
import { isDatabaseConfigured } from "@/lib/env";
import { currentUser } from "@/lib/auth/neon-auth";

export const dynamic = "force-dynamic";

/** Minimal session probe for client components (header account icon etc.). */
export async function GET() {
  if (!isDatabaseConfigured) return NextResponse.json({ user: null });
  const user = await currentUser().catch(() => null);
  return NextResponse.json(
    { user: user ? { id: user.id, email: user.email, user_metadata: { full_name: user.user_metadata.full_name ?? null, phone: user.user_metadata.phone ?? null } } : null },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
