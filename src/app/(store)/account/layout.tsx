import { AccountNav } from "@/components/account/account-nav";
import { getSessionUser } from "@/lib/auth/session";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export default async function AccountLayout({ children }: LayoutProps<"/account">) {
  let name = "Guest";
  if (!isPreviewMode) {
    const user = await getSessionUser();
    if (!user) redirect("/login?next=/account");
    const sb = await createServerSupabase();
    const { data } = await sb.from("profiles").select("full_name").eq("id", user.id).maybeSingle();
    name = data?.full_name || user.email || "there";
  }
  return (
    <div className="container-lux pb-24 pt-10">
      <div className="border-b border-line pb-8">
        <p className="eyebrow text-mocha">My account</p>
        <h1 className="display mt-3 text-[clamp(2.4rem,4.5vw,4rem)]">Hello, <em className="italic text-mocha">{name.split(" ")[0]}</em></h1>
      </div>
      {isPreviewMode && (
        <p className="mt-6 border border-gold/40 bg-gold/10 p-4 text-sm">Preview mode — orders, bookings and addresses appear here once Supabase is connected. Your wishlist works locally.</p>
      )}
      <div className="mt-10 grid gap-10 lg:grid-cols-[220px_1fr] lg:gap-16">
        <AccountNav />
        <div className="min-w-0">{children}</div>
      </div>
    </div>
  );
}
