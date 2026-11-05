"use client";

import * as React from "react";
import { toast } from "sonner";
import { subscribeNewsletter } from "@/features/marketing/actions";
import { cn } from "@/lib/utils";

export function NewsletterForm({ tone = "light", source = "website" }: { tone?: "light" | "dark"; source?: string }) {
  const [pending, start] = React.useTransition();
  const [done, setDone] = React.useState(false);
  const dark = tone === "dark";

  return (
    <form
      className="mt-8"
      action={(fd) =>
        start(async () => {
          const res = await subscribeNewsletter({ email: String(fd.get("email") ?? ""), source });
          if (res.ok) {
            setDone(true);
            toast.success("You're on the list. Welcome to RAVANTRA.");
          } else toast.error(res.error);
        })
      }
    >
      {done ? (
        <p className={cn("font-serif text-xl italic", dark ? "text-gold" : "text-mocha")}>Thank you — see you in your inbox.</p>
      ) : (
        <div className={cn("flex items-end gap-4 border-b pb-2", dark ? "border-ivory/40" : "border-espresso/50")}>
          <label className="sr-only" htmlFor={`nl-${source}`}>Email address</label>
          <input
            id={`nl-${source}`}
            name="email"
            type="email"
            required
            placeholder="Your email address"
            className={cn("w-full bg-transparent py-2 text-sm focus:outline-none", dark ? "text-ivory placeholder:text-ivory/40" : "placeholder:text-ink-mute")}
          />
          <button disabled={pending} className={cn("shrink-0 pb-2 text-[0.7rem] uppercase tracking-[0.2em] transition-opacity disabled:opacity-50", dark ? "text-gold" : "text-espresso")}>
            {pending ? "Joining…" : "Subscribe →"}
          </button>
        </div>
      )}
      <p className={cn("mt-3 text-[0.7rem]", dark ? "text-ivory/40" : "text-ink-mute")}>Unsubscribe anytime. We never share your details.</p>
    </form>
  );
}
