import * as React from "react";
import { cn } from "@/lib/utils";

export function Eyebrow({ className, children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("eyebrow text-mocha", className)} {...props}>
      {children}
    </p>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  action,
  className,
  index,
}: {
  eyebrow?: string;
  title: React.ReactNode;
  description?: React.ReactNode;
  align?: "left" | "center";
  action?: React.ReactNode;
  className?: string;
  index?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 md:flex-row md:items-end md:justify-between",
        align === "center" && "items-center text-center md:flex-col md:items-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        {(eyebrow || index) && (
          <div className={cn("mb-4 flex items-center gap-3", align === "center" && "justify-center")}>
            {index && <span className="font-serif text-sm italic text-gold-deep">{index}</span>}
            {index && eyebrow && <span className="h-px w-8 bg-line-strong" />}
            {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          </div>
        )}
        <h2 className="display text-[clamp(2.2rem,4.6vw,4rem)] text-espresso">{title}</h2>
        {description && <p className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-ink-soft">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

export function Badge({
  className,
  tone = "neutral",
  children,
}: {
  className?: string;
  tone?: "neutral" | "gold" | "dark" | "success" | "danger" | "warning" | "outline" | "info";
  children: React.ReactNode;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-champagne/70 text-espresso",
    gold: "bg-gold/15 text-gold-deep",
    dark: "bg-espresso text-ivory",
    success: "bg-success/12 text-success",
    danger: "bg-danger/10 text-danger",
    warning: "bg-warning/12 text-warning",
    info: "bg-sage/15 text-sage",
    outline: "border border-line-strong text-ink-soft",
  };
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-[0.65rem] font-medium uppercase tracking-[0.14em]", tones[tone], className)}>
      {children}
    </span>
  );
}

export function Label({ className, ...props }: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return <label className={cn("eyebrow mb-1 block text-[0.65rem] text-ink-soft", className)} {...props} />;
}

export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement> & { boxed?: boolean }>(
  function Input({ className, boxed, ...props }, ref) {
    return <input ref={ref} className={cn(boxed ? "field-box" : "field", className)} {...props} />;
  },
);

export const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement> & { boxed?: boolean }>(
  function Textarea({ className, boxed, ...props }, ref) {
    return <textarea ref={ref} className={cn(boxed ? "field-box" : "field", "min-h-24 resize-y", className)} {...props} />;
  },
);

export const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement> & { boxed?: boolean }>(
  function Select({ className, boxed, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          boxed ? "field-box" : "field",
          "cursor-pointer appearance-none bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='10' height='6' fill='none'><path d='M1 1l4 4 4-4' stroke='%23211B20' stroke-width='1.2'/></svg>\")] bg-[length:10px_6px] bg-[right_0.75rem_center] bg-no-repeat pr-8",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return <p className="mt-1.5 text-xs text-danger" role="alert">{children}</p>;
}

export function Field({
  label,
  error,
  hint,
  children,
  className,
  htmlFor,
}: {
  label: string;
  error?: string;
  hint?: string;
  children: React.ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex flex-col", className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-ink-mute">{hint}</p>}
      <FieldError>{error}</FieldError>
    </div>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("skeleton", className)} aria-hidden />;
}

export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-center justify-center px-6 py-20 text-center", className)}>
      {icon && <div className="mb-5 text-gold">{icon}</div>}
      <h3 className="font-serif text-3xl text-espresso">{title}</h3>
      {description && <p className="mt-3 max-w-sm text-sm leading-relaxed text-ink-soft">{description}</p>}
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

export function Stars({ value, size = 12, className }: { value: number; size?: number; className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-gold", className)} aria-label={`${value.toFixed(1)} out of 5`}>
      {Array.from({ length: 5 }).map((_, i) => {
        const fill = Math.max(0, Math.min(1, value - i));
        return (
          <svg key={i} width={size} height={size} viewBox="0 0 24 24" aria-hidden>
            <defs>
              <linearGradient id={`s${i}-${Math.round(fill * 100)}`}>
                <stop offset={`${fill * 100}%`} stopColor="currentColor" />
                <stop offset={`${fill * 100}%`} stopColor="currentColor" stopOpacity="0.2" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#s${i}-${Math.round(fill * 100)})`}
              d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"
            />
          </svg>
        );
      })}
    </span>
  );
}

export function DemoTag({ className, children = "Demo content" }: { className?: string; children?: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-[0.62rem] uppercase tracking-[0.18em] text-ink-mute", className)}>
      <span className="size-1.5 rounded-full bg-gold" aria-hidden />
      {children}
    </span>
  );
}
