import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthShell } from "@/components/account/auth-shell";
import { SignUpForm } from "@/components/account/auth-forms";
import { getSessionUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Create an account", robots: { index: false } };

export default async function RegisterPage({ searchParams }: PageProps<"/register">) {
  const sp = await searchParams;
  const next = typeof sp.next === "string" ? sp.next : undefined;
  if (await getSessionUser()) redirect("/account");
  return (
    <AuthShell eyebrow="Join RAVANTRA" title={<>One account, <em className="italic text-mocha">every house</em></>} image="1539109136881-3be0616acf4b">
      <SignUpForm next={next} />
      <p className="mt-8 text-center text-sm text-ink-soft">
        Already a member? <Link href="/login" className="text-espresso underline underline-offset-4">Sign in</Link>
      </p>
    </AuthShell>
  );
}
