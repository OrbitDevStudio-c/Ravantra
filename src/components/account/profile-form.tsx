"use client";

import * as React from "react";
import { toast } from "sonner";
import { updateProfile } from "@/features/account/actions";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/primitives";

export function ProfileForm({ profile, disabled }: { profile: { fullName: string; phone: string; email: string }; disabled?: boolean }) {
  const [state, action, pending] = React.useActionState(updateProfile, null);
  React.useEffect(() => {
    if (!state) return;
    if (state.ok) toast.success("Profile updated.");
    else toast.error(state.error);
  }, [state]);
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid max-w-xl gap-6 sm:grid-cols-2">
      <Field label="Full name" error={fe?.fullName?.[0]} htmlFor="p-name"><Input id="p-name" name="fullName" defaultValue={profile.fullName} required /></Field>
      <Field label="Phone" error={fe?.phone?.[0]} htmlFor="p-phone"><Input id="p-phone" name="phone" defaultValue={profile.phone} inputMode="tel" /></Field>
      <Field label="Email" hint="Contact us to change your sign-in email" className="sm:col-span-2" htmlFor="p-email"><Input id="p-email" value={profile.email} readOnly className="text-ink-mute" /></Field>
      <div className="sm:col-span-2"><Button loading={pending} disabled={disabled}>Save changes</Button></div>
    </form>
  );
}
