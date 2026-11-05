import Link from "next/link";

/** Shown only when Supabase isn't configured (zero-setup local preview). */
export function PreviewBanner() {
  return (
    <div className="bg-gold/20 px-4 py-2 text-center text-[0.72rem] text-espresso">
      <strong className="font-medium">Preview mode</strong> — showing bundled demo data. Connect Supabase (see README) to enable accounts,
      checkout, bookings and the live admin.{" "}
      <Link href="/admin" className="underline underline-offset-2">Preview the admin →</Link>
    </div>
  );
}
