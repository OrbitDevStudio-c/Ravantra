import type { Metadata } from "next";
import Link from "next/link";
import Image from "next/image";
import { isPreviewMode } from "@/lib/env";
import { adminUsers, DEMO_PASSWORD, img } from "@/config/demo-data";
import { AdminLoginForm } from "./login-form";

export const metadata: Metadata = { title: "Admin sign in", robots: { index: false, follow: false } };

export default async function AdminLoginPage({ searchParams }: PageProps<"/admin/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : "/admin";
  const notStaff = sp.error === "not_staff";

  return (
    <div className="grid min-h-dvh bg-ivory lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-espresso lg:block">
        <Image src={img("1560066984-138dadb4c035", 1400)} alt="" fill sizes="50vw" className="object-cover opacity-45" quality={60} priority />
        <div className="absolute inset-0 flex flex-col justify-between p-12 text-ivory">
          <span className="font-serif text-2xl tracking-[0.34em]">RAVANTRA</span>
          <div>
            <p className="eyebrow text-gold">Central administration</p>
            <p className="mt-4 max-w-md font-serif text-5xl leading-[1.02]">Every division, every order, every appointment — in one place.</p>
          </div>
          <p className="text-xs text-ivory/50">Designed &amp; developed by OrbitDevStudio</p>
        </div>
      </div>

      <div className="flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-sm">
          <Link href="/" className="font-serif text-xl tracking-[0.3em] lg:hidden">RAVANTRA</Link>
          <h1 className="mt-6 font-serif text-4xl text-espresso">Staff sign in</h1>
          <p className="mt-2 text-sm text-ink-soft">Use your RAVANTRA staff account. Access is based on your role.</p>

          {notStaff && (
            <p className="mt-6 border border-danger/30 bg-danger/5 px-3 py-2 text-sm text-danger">
              This account doesn&apos;t have a staff role. Sign in with a staff account or ask a super admin for access.
            </p>
          )}

          {isPreviewMode ? (
            <div className="mt-8 border border-gold/40 bg-gold/10 p-4 text-sm text-espresso">
              <p className="font-medium">Preview mode</p>
              <p className="mt-1 text-ink-soft">
                Supabase isn&apos;t configured, so sign-in is disabled. You can explore a read-only admin built from demo data.
              </p>
              <Link href="/admin" className="mt-4 inline-block bg-espresso px-5 py-2.5 text-xs uppercase tracking-[0.16em] text-ivory">
                Open admin preview →
              </Link>
            </div>
          ) : (
            <AdminLoginForm next={next} />
          )}

          <details className="mt-10 border-t border-line pt-5 text-xs text-ink-soft">
            <summary className="cursor-pointer select-none uppercase tracking-[0.14em] text-mocha">Demo accounts</summary>
            <p className="mt-3">Seeded by <code>supabase/seed.sql</code>. Password for all: <code className="text-espresso">{DEMO_PASSWORD}</code></p>
            <ul className="mt-3 space-y-1.5">
              {adminUsers.map((u) => (
                <li key={u.email} className="flex justify-between gap-3">
                  <code className="text-espresso">{u.email}</code>
                  <span className="text-ink-mute">{u.role.replace(/_/g, " ")}</span>
                </li>
              ))}
            </ul>
          </details>
        </div>
      </div>
    </div>
  );
}
