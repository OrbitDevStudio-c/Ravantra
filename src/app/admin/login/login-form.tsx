"use client";

import { useActionState } from "react";
import { signIn } from "@/features/auth/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";

export function AdminLoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState(signIn, null);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="mt-8 space-y-6">
      <input type="hidden" name="area" value="admin" />
      <input type="hidden" name="next" value={next} />
      <Field label="Email" htmlFor="email" error={fe?.email?.[0]}>
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </Field>
      <Field label="Password" htmlFor="password" error={fe?.password?.[0]}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </Field>
      {state && !state.ok && <p className="text-sm text-danger" role="alert">{state.error}</p>}
      <Button type="submit" className="w-full" loading={pending}>Sign in</Button>
    </form>
  );
}
