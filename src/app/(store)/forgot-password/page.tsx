import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/account/auth-shell";
import { ForgotPasswordForm } from "@/components/account/auth-forms";

export const metadata: Metadata = { title: "Reset password", robots: { index: false } };

export default function ForgotPasswordPage() {
  return (
    <AuthShell eyebrow="Account help" title="Reset your password">
      <p className="-mt-4 mb-8 text-sm text-ink-soft">Enter your email and we&apos;ll send you a secure link to choose a new password.</p>
      <ForgotPasswordForm />
      <p className="mt-8 text-center text-sm"><Link href="/login" className="underline underline-offset-4">Back to sign in</Link></p>
    </AuthShell>
  );
}
