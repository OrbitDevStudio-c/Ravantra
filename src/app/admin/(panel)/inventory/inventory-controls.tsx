"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/primitives";
import { Modal, useAdminAction } from "@/components/admin/client";
import { adjustStock, setThreshold } from "@/features/admin/inventory-actions";

export function AdjustStock({ variantId, label, current }: { variantId: string; label: string; current: number }) {
  const [open, setOpen] = React.useState(false);
  const [direction, setDirection] = React.useState<"in" | "out">("in");
  const [qty, setQty] = React.useState("");
  const [reason, setReason] = React.useState<"restock" | "adjustment" | "damage" | "return">("restock");
  const [note, setNote] = React.useState("");
  const { run, pending } = useAdminAction();
  const n = Math.max(0, Math.floor(Number(qty) || 0));
  const change = direction === "in" ? n : -n;
  const after = current + change;

  return (
    <>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Adjust</Button>
      <Modal open={open} onOpenChange={setOpen} title="Adjust stock">
        <p className="mb-5 text-sm text-ink-soft">{label}</p>
        <div className="grid grid-cols-2 gap-1 border border-line p-1">
          {(["in", "out"] as const).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => {
                setDirection(d);
                setReason(d === "in" ? "restock" : "adjustment");
              }}
              className={`py-2 text-xs uppercase tracking-[0.14em] ${direction === d ? "bg-espresso text-ivory" : "text-ink-soft"}`}
            >
              {d === "in" ? "Add stock" : "Remove stock"}
            </button>
          ))}
        </div>
        <div className="mt-5 grid grid-cols-2 gap-4">
          <Field label="Quantity" htmlFor="adj-qty">
            <Input boxed id="adj-qty" type="number" min={1} max={10000} value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
          </Field>
          <Field label="Reason" htmlFor="adj-reason">
            <Select boxed id="adj-reason" value={reason} onChange={(e) => setReason(e.target.value as typeof reason)}>
              {direction === "in" ? (
                <>
                  <option value="restock">Restock / delivery</option>
                  <option value="return">Customer return</option>
                  <option value="adjustment">Count correction</option>
                </>
              ) : (
                <>
                  <option value="adjustment">Count correction</option>
                  <option value="damage">Damaged / lost</option>
                </>
              )}
            </Select>
          </Field>
        </div>
        <Field label="Note" htmlFor="adj-note" className="mt-4">
          <Input boxed id="adj-note" value={note} onChange={(e) => setNote(e.target.value)} maxLength={280} placeholder="Supplier invoice, audit ref…" />
        </Field>
        <p className="mt-4 text-sm tabular-nums text-ink-soft">
          {current} → <strong className={after < 0 ? "text-danger" : "text-espresso"}>{after}</strong> on hand
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancel</Button>
          <Button
            size="sm"
            loading={pending}
            disabled={n === 0 || after < 0}
            onClick={() =>
              run(() => adjustStock({ variantId, change, reason, note: note || undefined }), {
                success: "Stock updated",
                onSuccess: () => {
                  setOpen(false);
                  setQty("");
                  setNote("");
                },
              })
            }
          >
            Save adjustment
          </Button>
        </div>
      </Modal>
    </>
  );
}

export function ThresholdEditor({ variantId, value }: { variantId: string; value: number }) {
  const [v, setV] = React.useState(String(value));
  const { run, pending } = useAdminAction();
  const dirty = Number(v) !== value;
  return (
    <form
      className="flex items-center gap-1"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => setThreshold(variantId, Number(v)), { success: "Alert threshold saved" });
      }}
    >
      <input
        type="number"
        min={0}
        max={1000}
        value={v}
        onChange={(e) => setV(e.target.value)}
        className="field-box w-16 !py-1 text-xs tabular-nums"
        aria-label="Low-stock alert threshold"
      />
      {dirty && (
        <button disabled={pending} className="text-[0.7rem] uppercase tracking-[0.1em] text-gold-deep hover:underline disabled:opacity-50">
          Save
        </button>
      )}
    </form>
  );
}
