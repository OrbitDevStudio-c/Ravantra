import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isPreviewMode } from "@/lib/env";
import { img } from "@/config/demo-data";
import { AdminLoginForm } from "./login-form";
import { Logo } from "@/components/ui/logo";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  const notStaff = sp.error === "not_staff";

  return (
    <div className="grid min-h-dvh bg-midnight lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-obsidian lg:block">
        <Image src={img("1560066984-138dadb4c035", 1400)} alt="" fill sizes="50vw" className="object-cover opacity-45" quality={60} priority />
        <div className="absolute inset-0 flex flex-col justify-between p-12 text-porcelain">
          <Logo variant="full" tone="light" height={130} />
          <div>
            <p className="eyebrow text-gold">Central administration</p>
            <p className="mt-4 max-w-md font-serif text-5xl leading-[1.02]">Every division, every order, every appointment — in one place.</p>
          </div>
          <p className="text-xs text-porcelain/50">Designed &amp; developed by OrbitDevStudio</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="inline-block lg:hidden" aria-label="RAVANTRA home"><Logo variant="full" height={110} /></Link>
          <h1 className="mt-6 font-serif text-4xl text-ink">Staff sign in</h1>
          <p className="mt-2 text-sm text-ink-soft">Use your RAVANTRA staff account. Access is based on your role.</p>

          {notStaff && (
            <p className="mt-6 border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              This account doesn&apos;t have a staff role. Sign in with a staff account or ask a super admin for access.
            </p>
          )}

          {isPreviewMode ? (
            <div className="mt-8 border border-gold/40 bg-gold/10 p-4 text-sm text-ink">
              <p className="font-medium">Preview mode</p>
              <p className="mt-1 text-ink-soft">
                The database isn&apos;t configured (DATABASE_URL), so sign-in is disabled. You can explore a read-only admin built from demo data.
              </p>
              <Link href="/admin" className="mt-4 inline-block bg-white px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-midnight">
                Open admin preview →
              </Link>
            </div>
          ) : (
            <AdminLoginForm next={next} />
          )}

        </div>
      </div>
    </div>
  );
}
