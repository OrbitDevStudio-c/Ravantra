"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "@/lib/utils";

export const Sheet = Dialog.Root;
export const SheetTrigger = Dialog.Trigger;
export const SheetClose = Dialog.Close;

export function SheetContent({
  side = "right",
  title,
  description,
  className,
  children,
  hideClose,
}: {
  side?: "right" | "left" | "top" | "center";
  title: string;
  description?: string;
  className?: string;
  children: React.ReactNode;
  hideClose?: boolean;
}) {
  const sideCls = {
    right: "inset-y-0 right-0 h-full w-full max-w-md data-[state=open]:animate-[sheet-in-r_.5s_var(--ease-lux)] data-[state=closed]:animate-[sheet-out-r_.3s_ease-in]",
    left: "inset-y-0 left-0 h-full w-full max-w-sm data-[state=open]:animate-[sheet-in-l_.5s_var(--ease-lux)] data-[state=closed]:animate-[sheet-out-l_.3s_ease-in]",
    top: "inset-x-0 top-0 w-full data-[state=open]:animate-[sheet-in-t_.5s_var(--ease-lux)] data-[state=closed]:animate-[sheet-out-t_.3s_ease-in]",
    center:
      "left-1/2 top-1/2 w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 data-[state=open]:animate-[fade-up_.4s_var(--ease-lux)]",
  }[side];

  return (
    <Dialog.Portal>
      <Dialog.Overlay className="fixed inset-0 z-[80] bg-espresso/40 backdrop-blur-[2px] data-[state=open]:animate-[fade-in_.3s_ease] data-[state=closed]:animate-[fade-out_.2s_ease]" />
      <Dialog.Content className={cn("fixed z-[90] flex flex-col bg-ivory shadow-[0_20px_80px_-20px_rgba(33,27,32,0.35)] focus:outline-none", sideCls, className)}>
        <Dialog.Title className={cn(side === "top" && "sr-only", "sr-only")}>{title}</Dialog.Title>
        {description ? <Dialog.Description className="sr-only">{description}</Dialog.Description> : <Dialog.Description className="sr-only">{title}</Dialog.Description>}
        {!hideClose && (
          <Dialog.Close className="absolute right-4 top-4 z-10 grid size-10 place-items-center text-espresso transition hover:rotate-90" aria-label="Close">
            <X className="size-5" strokeWidth={1.25} />
          </Dialog.Close>
        )}
        {children}
      </Dialog.Content>
    </Dialog.Portal>
  );
}
