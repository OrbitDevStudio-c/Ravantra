"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { Button, type ButtonProps } from "@/components/ui/button";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { AdminResult } from "@/features/admin/types";
import { cn } from "@/lib/utils";

/** Runs a server action, toasts the result and refreshes server data. */
export function useAdminAction() {
  const router = useRouter();
  const [pending, start] = React.useTransition();
  const run = React.useCallback(
    <T,>(fn: () => Promise<AdminResult<T>>, opts?: { success?: string; onSuccess?: (data?: T) => void }) =>
      start(async () => {
        const res = await fn();
        if (res.ok) {
          if (opts?.success) toast.success(opts.success);
          opts?.onSuccess?.(res.data);
          router.refresh();
        } else {
          toast.error(res.error);
        }
      }),
    [router],
  );
  return { run, pending };
}

export function ActionButton({
  action,
  confirm,
  success,
  children,
  ...props
}: Omit<ButtonProps, "onClick" | "action"> & {
  action: () => Promise<AdminResult<unknown>>;
  confirm?: string;
  success?: string;
}) {
  const { run, pending } = useAdminAction();
  return (
    <Button
      {...props}
      loading={pending}
      onClick={() => {
        if (confirm && !window.confirm(confirm)) return;
        run(action, { success });
      }}
    >
      {children}
    </Button>
  );
}

/** GET filter form that submits on change (keeps URLs shareable, server does the filtering). */
export function FilterBar({ children, className }: { children: React.ReactNode; className?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const ref = React.useRef<HTMLFormElement>(null);
  const submit = () => {
    const fd = new FormData(ref.current!);
    const sp = new URLSearchParams();
    fd.forEach((v, k) => {
      if (typeof v === "string" && v) sp.set(k, v);
    });
    router.replace(sp.toString() ? `${pathname}?${sp}` : pathname);
  };
  return (
    <form
      ref={ref}
      className={cn("mb-4 flex flex-wrap items-end gap-2", className)}
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
      onChange={(e) => {
        const el = e.target as unknown as HTMLInputElement;
        if (el.tagName === "SELECT" || el.type === "checkbox" || el.type === "date") submit();
      }}
    >
      {children}
      <button type="submit" className="h-[38px] border border-line-strong bg-white px-4 text-xs uppercase tracking-[0.12em] hover:border-espresso">
        Apply
      </button>
    </form>
  );
}

export function useParam(name: string) {
  return useSearchParams().get(name) ?? "";
}

/** Centered modal built on the shared Sheet (Radix Dialog). */
export function Modal({
  open,
  onOpenChange,
  title,
  children,
  wide,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="center" title={title} className={cn("max-h-[90dvh] overflow-y-auto", wide ? "max-w-2xl" : "max-w-lg")}>
        <div className="p-6">
          <h2 className="mb-5 font-serif text-2xl text-espresso">{title}</h2>
          {children}
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ModalTrigger({
  label,
  title,
  children,
  variant = "outline",
  size = "sm",
  wide,
}: {
  label: React.ReactNode;
  title: string;
  children: (close: () => void) => React.ReactNode;
  variant?: ButtonProps["variant"];
  size?: ButtonProps["size"];
  wide?: boolean;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} type="button">
        {label}
      </Button>
      <Modal open={open} onOpenChange={setOpen} title={title} wide={wide}>
        {open && children(() => setOpen(false))}
      </Modal>
    </>
  );
}

export function Toggle({ checked, onChange, label, disabled }: { checked: boolean; onChange: (v: boolean) => void; label: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn("relative h-5 w-9 shrink-0 rounded-full transition-colors disabled:opacity-50", checked ? "bg-espresso" : "bg-line-strong")}
    >
      <span className={cn("absolute top-0.5 size-4 rounded-full bg-white shadow transition-transform", checked ? "translate-x-[18px]" : "translate-x-0.5")} />
    </button>
  );
}

/** Toggle wired to a server action (e.g. featured / active flags). */
export function ActionToggle({ checked, label, action }: { checked: boolean; label: string; action: (v: boolean) => Promise<AdminResult<unknown>> }) {
  const [value, setValue] = React.useState(checked);
  const { run, pending } = useAdminAction();
  return (
    <Toggle
      checked={value}
      label={label}
      disabled={pending}
      onChange={(v) => {
        setValue(v);
        run(() => action(v).then((r) => (r.ok ? r : (setValue(!v), r))));
      }}
    />
  );
}
