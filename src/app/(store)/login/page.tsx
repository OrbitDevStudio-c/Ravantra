import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/auth-shell";
import { SignInForm } from "@/components/account/auth-forms";
import { getAccess } from "@/lib/auth/session";
import { isPreviewMode } from "@/lib/env";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  const access = isPreviewMode ? null : await getAccess();
  if (access) redirect(next?.startsWith("/") && !next.startsWith("//") ? next : access.isStaff ? "/admin" : "/account");

  return (
    <AuthShell eyebrow="Welcome back" title={<>Sign in to <em className="italic text-gold">RAVANTRA</em></>}>
      {isPreviewMode && (
        <p className="mb-8 border border-gold/40 bg-gold/10 p-4 text-sm">Preview mode — accounts need the database. Set <code>DATABASE_URL</code> and run <code>npm run db:setup</code> to enable sign-in.</p>
      )}
      <SignInForm next={next} />
      <p className="mt-8 text-center text-sm text-ink-soft">
        New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-ink underline underline-offset-4">Create an account</Link>
      </p>
    </AuthShell>
  );
}
