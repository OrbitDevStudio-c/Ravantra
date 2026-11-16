import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

/** Hover fill that rises from the button's base (transform-only, sits behind the label). */
const wipe =
  "before:absolute before:inset-0 before:-z-10 before:origin-bottom before:scale-y-0 before:transition-transform before:duration-500 before:ease-[var(--ease-lux)] before:content-[''] hover:before:scale-y-100 focus-visible:before:scale-y-100";

const buttonVariants = cva(
  "group/btn relative isolate inline-flex items-center justify-center gap-2.5 overflow-hidden whitespace-nowrap font-sans text-[0.75rem] font-semibold uppercase tracking-[0.18em] transition-[background-color,color,border-color,box-shadow,opacity,transform] duration-300 ease-[var(--ease-lux)] focus-visible:outline-offset-2 disabled:pointer-events-none disabled:opacity-45 active:scale-[0.985] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        /** Brand CTA — Royal Burgundy */
        /** Brand CTA — Royal Burgundy, lifting toward blush on hover */
        primary: cn(wipe, "bg-burgundy text-white shadow-[inset_0_1px_0_rgb(255_255_255/0.08)] before:bg-burgundy-deep"),
        /** Quiet CTA — elevated plum with a hairline */
        dark: cn(wipe, "border border-line-strong bg-plum text-white before:bg-burgundy hover:border-burgundy"),
        gold: "bg-gold text-midnight hover:bg-rose",
        outline: cn(wipe, "border border-white/55 text-white before:bg-white hover:border-white hover:text-midnight"),
        "outline-brand": cn(wipe, "border border-blush/50 text-blush before:bg-burgundy hover:border-burgundy hover:text-white"),
        "outline-light": cn(wipe, "border border-white/60 text-white before:bg-white hover:border-white hover:text-midnight"),
        light: "bg-white text-midnight hover:bg-rose",
        ghost: "text-white hover:bg-white/[0.07]",
        link: "h-auto px-0 normal-case tracking-normal text-sm font-medium text-blush underline-offset-4 hover:underline",
        danger: "bg-danger-deep text-white hover:bg-danger-deep/85",
      },
      size: {
        sm: "h-9 px-4 text-[0.68rem]",
        md: "h-11 px-6",
        lg: "h-[3.25rem] px-8",
        icon: "size-10 p-0 tracking-normal",
      },
    },
    defaultVariants: { variant: "primary", size: "md" },
  },
);

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
}

export function Button({ className, variant, size, asChild, loading, children, disabled, ...props }: ButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp className={cn(buttonVariants({ variant, size }), className)} disabled={disabled || loading} aria-busy={loading || undefined} {...props}>
      {asChild ? (
        children
      ) : (
        <>
          {loading && <span className="absolute inset-0 flex items-center justify-center"><Spinner /></span>}
          <span className={cn("inline-flex items-center gap-2", loading && "opacity-0")}>{children}</span>
        </>
      )}
    </Comp>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      className={cn("inline-block size-4 animate-spin rounded-full border-[1.5px] border-current border-r-transparent", className)}
      role="status"
      aria-label="Loading"
    />
  );
}

/** Arrow that nudges on hover — used in editorial CTAs */
export function ArrowRight({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 12" fill="none" className={cn("h-3 w-6 transition-transform duration-500 ease-[var(--ease-lux)] group-hover/btn:translate-x-1 group-hover:translate-x-1", className)} aria-hidden>
      <path d="M0 6h22M17 1l5 5-5 5" stroke="currentColor" strokeWidth="1.2" />
    </svg>
  );
}

export { buttonVariants };
