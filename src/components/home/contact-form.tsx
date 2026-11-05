"use client";

import * as React from "react";
import { sendContactMessage } from "@/features/contact/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/primitives";

export function ContactForm() {
  const [state, action, pending] = React.useActionState(sendContactMessage, null);
  if (state?.ok) {
    return (
      <div className="border border-success/30 bg-success/5 p-8">
        <p className="font-serif text-3xl">Thank you.</p>
        <p className="mt-2 text-sm text-ink-soft">Our client care team replies within one working day.</p>
      </div>
    );
  }
  const fe = state && !state.ok ? state.fieldErrors : undefined;
  return (
    <form action={action} className="grid gap-7 sm:grid-cols-2">
      {state && !state.ok && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      <Field label="Name" error={fe?.name?.[0]} htmlFor="c-name"><Input id="c-name" name="name" autoComplete="name" required /></Field>
      <Field label="Email" error={fe?.email?.[0]} htmlFor="c-email"><Input id="c-email" name="email" type="email" autoComplete="email" required /></Field>
      <Field label="Topic" className="sm:col-span-2" htmlFor="c-topic">
        <Select id="c-topic" name="topic" defaultValue="Order">
          {["Order", "Salon & Spa", "Product question", "Partnerships", "Other"].map((t) => <option key={t}>{t}</option>)}
        </Select>
      </Field>
      <Field label="Message" error={fe?.message?.[0]} className="sm:col-span-2" htmlFor="c-msg"><Textarea id="c-msg" name="message" required minLength={10} rows={5} /></Field>
      <input type="text" name="website" tabIndex={-1} autoComplete="off" className="hidden" aria-hidden />
      <div className="sm:col-span-2"><Button size="lg" loading={pending}>Send message</Button></div>
    </form>
  );
}
