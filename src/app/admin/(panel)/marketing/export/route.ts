import { NextResponse } from "next/server";
import { getAccess } from "@/lib/auth/session";
import { can } from "@/lib/auth/permissions";
import { listSubscribers } from "@/features/admin/marketing";

/** CSV export of newsletter subscribers — permission checked server-side (and by RLS). */
export async function GET() {
  const access = await getAccess();
  if (!access?.isStaff || !can(access, "marketing.manage")) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const rows = await listSubscribers();
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  // guard against CSV formula injection
  const safe = (v: string) => esc(/^[=+\-@]/.test(v) ? `'${v}` : v);
  const csv = ["email,source,active,subscribed_at", ...rows.map((r) => [safe(r.email), safe(r.source), r.isActive ? "yes" : "no", r.createdAt].join(","))].join("\n");
  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="ravantra-subscribers-${new Date().toISOString().slice(0, 10)}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
