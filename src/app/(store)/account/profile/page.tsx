import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/profile-form";
import { UpdatePasswordForm } from "@/components/account/auth-forms";
import { isPreviewMode } from "@/lib/env";
import { createServerSupabase } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Profile & security", robots: { index: false } };

export default async function ProfilePage({ searchParams }: PageProps<"/account/profile">) {
  const sp = await searchParams;
  let profile = { fullName: "", phone: "", email: "" };
  if (!isPreviewMode) {
    const sb = await createServerSupabase();
    const { data: auth } = await sb.auth.getUser();
    const { data } = await sb.from("profiles").select("full_name, phone, email").eq("id", auth.user?.id ?? "").maybeSingle();
    profile = { fullName: data?.full_name ?? "", phone: data?.phone ?? "", email: data?.email ?? auth.user?.email ?? "" };
  }
  return (
    <div className="space-y-16">
      <section>
        <h2 className="border-b border-line pb-4 font-serif text-3xl">Profile</h2>
        <div className="mt-8"><ProfileForm profile={profile} disabled={isPreviewMode} /></div>
      </section>
      <section id="password">
        <h2 className="border-b border-line pb-4 font-serif text-3xl">Password</h2>
        {sp.reset === "1" && <p className="mt-6 text-sm text-mocha">Choose a new password to finish resetting your account.</p>}
        <div className="mt-8"><UpdatePasswordForm /></div>
      </section>
    </div>
  );
}
