"use client";

import * as React from "react";
import Link from "next/link";
import { Eye, EyeOff } from "lucide-react";
import { requestPasswordReset, signIn, signUp, updatePassword } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";
import type { ActionResult } from "@/types";

function FormError({ state }: { state: ActionResult | null }) {
  if (!state || state.ok) return null;
  return <p className="border border-danger/25 bg-danger/5 px-4 py-3 text-sm text-danger" role="alert">{state.error}</p>;
}

function PasswordInput(props: React.InputHTMLAttributes<HTMLInputElement>) {
  const [show, setShow] = React.useState(false);
  return (
    <div className="relative">
      <Input {...props} type={show ? "text" : "password"} className="pr-10" />
      <button type="button" onClick={() => setShow(!show)} className="absolute right-0 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-ink-mute" aria-label={show ? "Hide password" : "Show password"}>
        {show ? <EyeOff className="size-4" strokeWidth={1.25} /> : <Eye className="size-4" strokeWidth={1.25} />}
      </button>
    </div>
  );
}

export function SignInForm({ next, area = "store" }: { next?: string; area?: "store" | "admin" }) {
  const [state, action, pending] = React.useActionState(signIn, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="next" value={next ?? ""} />
      <input type="hidden" name="area" value={area} />
      <FormError state={state} />
      <Field label="Email" error={fe?.email?.[0]} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Password" error={fe?.password?.[0]} htmlFor="password"><PasswordInput id="password" name="password" autoComplete="current-password" required /></Field>
      {area === "store" && (
        <div className="flex justify-end">
          <Link href="/forgot-password" className="text-xs text-ink-soft underline-offset-4 hover:underline">Forgot password?</Link>
        </div>
      )}
      <Button size="lg" className="w-full" loading={pending}>Sign in</Button>
    </form>
  );
}

export function SignUpForm({ next }: { next?: string }) {
  const [state, action, pending] = React.useActionState(signUp, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  if (state?.ok) {
    return (
      <div className="border border-success/30 bg-success/5 p-6">
        <p className="font-serif text-2xl">Check your inbox</p>
        <p className="mt-2 text-sm text-ink-soft">We&apos;ve sent a confirmation link to finish creating your account.</p>
      </div>
    );
  }
  return (
    <form action={action} className="space-y-7">
      <input type="hidden" name="next" value={next ?? ""} />
      <FormError state={state} />
      <Field label="Full name" error={fe?.fullName?.[0]} htmlFor="fullName"><Input id="fullName" name="fullName" autoComplete="name" required /></Field>
      <Field label="Email" error={fe?.email?.[0]} htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Phone (optional)" error={fe?.phone?.[0]} htmlFor="phone"><Input id="phone" name="phone" type="tel" autoComplete="tel" placeholder="+91" /></Field>
      <Field label="Password" error={fe?.password?.[0]} hint="At least 8 characters, with a letter and a number" htmlFor="password">
        <PasswordInput id="password" name="password" autoComplete="new-password" required minLength={8} />
      </Field>
      <Button size="lg" className="w-full" loading={pending}>Create account</Button>
      <p className="text-center text-[0.7rem] leading-relaxed text-ink-mute">One account for shopping, wishlists and salon bookings across every RAVANTRA division.</p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [state, action, pending] = React.useActionState(requestPasswordReset, null);
  if (state?.ok) {
    return <p className="border border-line bg-white/50 p-6 text-sm text-ink-soft">If an account exists for that email, a reset link is on its way.</p>;
  }
  return (
    <form action={action} className="space-y-7">
      <FormError state={state} />
      <Field label="Email" htmlFor="email"><Input id="email" name="email" type="email" autoComplete="email" required /></Field>
      <Button size="lg" className="w-full" loading={pending}>Send reset link</Button>
    </form>
  );
}

export function UpdatePasswordForm() {
  const [state, action, pending] = React.useActionState(updatePassword, null);
  const formRef = React.useRef<HTMLFormElement>(null);
  React.useEffect(() => {
    if (state?.ok) formRef.current?.reset();
  }, [state]);
  return (
    <form ref={formRef} action={action} className="max-w-md space-y-6">
      <FormError state={state} />
      {state?.ok && <p className="border border-success/30 bg-success/5 px-4 py-3 text-sm text-success">Password updated.</p>}
      <Field label="New password" hint="At least 8 characters, with a letter and a number" htmlFor="np"><PasswordInput id="np" name="password" autoComplete="new-password" required minLength={8} /></Field>
      <Field label="Confirm new password" htmlFor="cp"><PasswordInput id="cp" name="confirm" autoComplete="new-password" required minLength={8} /></Field>
      <Button loading={pending}>Update password</Button>
    </form>
  );
}
