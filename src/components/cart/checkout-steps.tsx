import Link from "next/link";
import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STEPS = [
  { label: "Bag", href: "/cart" },
  { label: "Details & payment", href: "/checkout" },
  { label: "Confirmation" },
] as const;

/** Three-step progress shared by the bag, checkout and confirmation pages. */
export function CheckoutSteps({ current }: { current: 0 | 1 | 2 }) {
  return (
    <nav aria-label="Checkout progress">
      <ol className="flex items-center gap-3 text-[0.64rem] font-semibold uppercase tracking-[0.18em] sm:gap-4">
        {STEPS.map((s, i) => {
          const done = i < current;
          const here = i === current;
          const content = (
            <span className={cn("inline-flex items-center gap-2", here ? "text-blush" : done ? "text-ink" : "text-ink-mute")}>
              <span
                className={cn(
                  "grid size-5 place-items-center rounded-full border text-[0.6rem]",
                  here ? "border-burgundy bg-burgundy text-white" : done ? "border-ink bg-white text-midnight" : "border-line-strong",
                )}
                aria-hidden
              >
                {done ? <Check className="size-3" strokeWidth={2} /> : i + 1}
              </span>
              <span className={cn(!here && "max-sm:sr-only")}>{s.label}</span>
            </span>
          );
          return (
            <li key={s.label} className="flex items-center gap-3 sm:gap-4" aria-current={here ? "step" : undefined}>
              {done && "href" in s ? (
                <Link href={s.href} className="transition-opacity hover:opacity-70">
                  {content}
                </Link>
              ) : (
                content
              )}
              {i < STEPS.length - 1 && <span className={cn("h-px w-6 sm:w-10", done ? "bg-white" : "bg-line-strong")} aria-hidden />}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
