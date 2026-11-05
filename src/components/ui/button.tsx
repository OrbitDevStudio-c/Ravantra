import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "group/btn relative inline-flex items-center justify-center gap-2 whitespace-nowrap font-sans text-[0.8rem] font-medium uppercase tracking-[0.16em] transition-[background-color,color,border-color,opacity,transform] duration-300 ease-[var(--ease-lux)] disabled:pointer-events-none disabled:opacity-50 active:scale-[0.985] [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        primary: "bg-espresso text-ivory hover:bg-espresso-2",
        gold: "bg-gold text-espresso hover:bg-gold-deep hover:text-ivory",
        outline: "border border-espresso/80 text-espresso hover:bg-espresso hover:text-ivory",
        "outline-light": "border border-ivory/70 text-ivory hover:bg-ivory hover:text-espresso",
        light: "bg-ivory text-espresso hover:bg-white",
        ghost: "text-espresso hover:bg-espresso/5",
        link: "h-auto px-0 normal-case tracking-normal text-sm underline-offset-4 hover:underline",
        danger: "bg-danger text-white hover:bg-danger/90",
      },
      size: {
        sm: "h-9 px-4 text-[0.7rem]",
        md: "h-11 px-6",
        lg: "h-14 px-9",
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
