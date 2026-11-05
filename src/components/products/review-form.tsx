"use client";

import * as React from "react";
import Link from "next/link";
import { toast } from "sonner";
import { Star } from "lucide-react";
import { submitReview } from "@/features/reviews/actions";
import { useAuthUser } from "@/features/auth/use-auth";
import { Button } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { cn } from "@/lib/utils";

export function ReviewForm({ productId, slug }: { productId: string; slug: string }) {
  const { user, ready } = useAuthUser();
  const [open, setOpen] = React.useState(false);
  const [rating, setRating] = React.useState(5);
  const [, action, pending] = React.useActionState(async (prev: Awaited<ReturnType<typeof submitReview>> | null, fd: FormData) => {
    const res = await submitReview(prev, fd);
    if (res.ok) {
      toast.success("Thank you — your review is live.");
      setOpen(false);
    } else toast.error(res.error);
    return res;
  }, null);

  if (!ready) return null;
  if (!user)
    return (
      <p className="text-sm text-ink-soft">
        <Link href={`/login?next=/products/${slug}`} className="underline underline-offset-4">Sign in</Link> to share your experience.
      </p>
    );
  if (!open)
    return (
      <Button variant="outline" onClick={() => setOpen(true)}>Write a review</Button>
    );

  return (
    <form action={action} className="max-w-xl space-y-6 border border-line bg-white/40 p-6">
      <input type="hidden" name="productId" value={productId} />
      <input type="hidden" name="slug" value={slug} />
      <input type="hidden" name="rating" value={rating} />
      <fieldset>
        <legend className="eyebrow mb-2 text-[0.65rem] text-ink-soft">Your rating</legend>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => setRating(n)} aria-label={`${n} star${n > 1 ? "s" : ""}`} aria-pressed={rating === n}>
              <Star className={cn("size-6 text-gold", n <= rating && "fill-gold")} strokeWidth={1.25} />
            </button>
          ))}
        </div>
      </fieldset>
      <Field label="Title"><Input name="title" required maxLength={120} placeholder="In a few words" /></Field>
      <Field label="Review"><Textarea name="body" required minLength={20} maxLength={2000} placeholder="Fit, feel, how you wore it…" /></Field>
      <div className="flex gap-3">
        <Button loading={pending}>Submit review</Button>
        <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
      </div>
    </form>
  );
}
