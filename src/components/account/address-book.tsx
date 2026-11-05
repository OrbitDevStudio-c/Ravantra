"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { MapPin } from "lucide-react";
import { deleteAddress, saveAddress, setDefaultAddress } from "@/features/account/actions";
import { addressSchema, INDIAN_STATES, type AddressInput } from "@/lib/validations";
import { Button } from "@/components/ui/button";
import { EmptyState, Field, Input, Select } from "@/components/ui/primitives";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import type { Address } from "@/types";

export function AddressBook({ addresses, disabled }: { addresses: Address[]; disabled?: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState<Address | "new" | null>(null);

  const remove = async (id: string) => {
    if (!confirm("Delete this address?")) return;
    const res = await deleteAddress(id);
    if (res.ok) {
      toast.success("Address removed.");
      router.refresh();
    } else toast.error(res.error);
  };
  const makeDefault = async (id: string) => {
    const res = await setDefaultAddress(id);
    if (res.ok) router.refresh();
    else toast.error(res.error);
  };

  return (
    <div>
      <div className="flex items-baseline justify-between border-b border-line pb-4">
        <h2 className="font-serif text-3xl">Address book</h2>
        <Button size="sm" onClick={() => setEditing("new")} disabled={disabled}>Add address</Button>
      </div>
      {addresses.length === 0 ? (
        <EmptyState icon={<MapPin className="size-9" strokeWidth={1} />} title="No saved addresses" description="Save an address for faster checkout." />
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {addresses.map((a) => (
            <li key={a.id} className="border border-line bg-white/40 p-6 text-sm">
              <p className="flex items-center gap-2 font-medium">{a.label}{a.isDefault && <span className="text-[0.6rem] uppercase tracking-widest text-mocha">· Default</span>}</p>
              <p className="mt-3 leading-relaxed text-ink-soft">{a.fullName}<br />{a.line1}{a.line2 ? `, ${a.line2}` : ""}<br />{a.city}, {a.state} {a.postalCode}<br />{a.phone}</p>
              <div className="mt-5 flex gap-4 text-xs">
                <button onClick={() => setEditing(a)} className="underline-offset-4 hover:underline">Edit</button>
                {!a.isDefault && <button onClick={() => makeDefault(a.id!)} className="underline-offset-4 hover:underline">Set as default</button>}
                <button onClick={() => remove(a.id!)} className="text-danger underline-offset-4 hover:underline">Delete</button>
              </div>
            </li>
          ))}
        </ul>
      )}
      <Sheet open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <SheetContent title="Address" side="right">
          {editing !== null && (
            <AddressForm
              address={editing === "new" ? null : editing}
              onDone={() => {
                setEditing(null);
                router.refresh();
              }}
            />
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function AddressForm({ address, onDone }: { address: Address | null; onDone: () => void }) {
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: address
      ? { fullName: address.fullName, phone: address.phone, line1: address.line1, line2: address.line2 ?? "", city: address.city, state: address.state, postalCode: address.postalCode, label: address.label, isDefault: address.isDefault }
      : { label: "Home", fullName: "", phone: "", line1: "", line2: "", city: "", state: "", postalCode: "", isDefault: false },
  });
  const e = form.formState.errors;
  return (
    <form
      className="flex h-full flex-col"
      onSubmit={form.handleSubmit(async (v) => {
        const res = await saveAddress({ ...v, id: address?.id });
        if (res.ok) {
          toast.success("Address saved.");
          onDone();
        } else toast.error(res.error);
      })}
      noValidate
    >
      <p className="px-6 pb-2 pt-6 font-serif text-3xl">{address ? "Edit address" : "New address"}</p>
      <div className="flex-1 space-y-6 overflow-y-auto px-6 py-4">
        <Field label="Label" htmlFor="a-label"><Input id="a-label" {...form.register("label")} placeholder="Home, Work…" /></Field>
        <Field label="Full name" error={e.fullName?.message} htmlFor="a-name"><Input id="a-name" {...form.register("fullName")} /></Field>
        <Field label="Phone" error={e.phone?.message} htmlFor="a-phone"><Input id="a-phone" inputMode="tel" {...form.register("phone")} /></Field>
        <Field label="Address line 1" error={e.line1?.message} htmlFor="a-l1"><Input id="a-l1" {...form.register("line1")} /></Field>
        <Field label="Address line 2" htmlFor="a-l2"><Input id="a-l2" {...form.register("line2")} /></Field>
        <div className="grid grid-cols-2 gap-6">
          <Field label="City" error={e.city?.message} htmlFor="a-city"><Input id="a-city" {...form.register("city")} /></Field>
          <Field label="PIN code" error={e.postalCode?.message} htmlFor="a-pin"><Input id="a-pin" inputMode="numeric" maxLength={6} {...form.register("postalCode")} /></Field>
        </div>
        <Field label="State" error={e.state?.message} htmlFor="a-state">
          <Select id="a-state" {...form.register("state")}>
            <option value="">Select state</option>
            {INDIAN_STATES.map((s) => <option key={s}>{s}</option>)}
          </Select>
        </Field>
        <label className="flex items-center gap-3 text-sm"><input type="checkbox" className="accent-espresso" {...form.register("isDefault")} /> Use as default address</label>
      </div>
      <div className="border-t border-line p-4">
        <Button className="w-full" loading={form.formState.isSubmitting}>Save address</Button>
      </div>
    </form>
  );
}
