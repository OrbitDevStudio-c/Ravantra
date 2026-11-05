import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/auth-shell";
import { SignInForm } from "@/components/account/auth-forms";
import { getSessionUser } from "@/lib/auth/session";
import { isPreviewMode } from "@/lib/env";
import { DEMO_PASSWORD } from "@/config/demo-data";

export const metadata: Metadata = { title: "Sign in", robots: { index: false } };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  if (await getSessionUser()) redirect(next?.startsWith("/") ? next : "/account");

  return (
    <AuthShell eyebrow="Welcome back" title={<>Sign in to <em className="italic text-mocha">RAVANTRA</em></>}>
      {isPreviewMode && (
        <p className="mb-8 border border-gold/40 bg-gold/10 p-4 text-sm">Preview mode — accounts need Supabase. Add your keys to <code>.env.local</code> to enable sign-in.</p>
      )}
      <SignInForm next={next} />
      <p className="mt-8 text-center text-sm text-ink-soft">
        New here? <Link href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="text-espresso underline underline-offset-4">Create an account</Link>
      </p>
      <details className="mt-10 border-t border-line pt-6 text-xs text-ink-mute">
        <summary className="cursor-pointer">Demo customer account</summary>
        <p className="mt-3">Email <code className="text-espresso">ananya@ravantra.test</code> · Password <code className="text-espresso">{DEMO_PASSWORD}</code> (after running the seed).</p>
      </details>
    </AuthShell>
  );
}
