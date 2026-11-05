"use client";

import * as React from "react";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/primitives";
import { useAdminAction } from "@/components/admin/client";
import { grantRole, revokeRole } from "@/features/admin/staff-actions";

export function GrantRoleForm({ roles }: { roles: { id: string; name: string }[] }) {
  const [email, setEmail] = React.useState("");
  const [roleId, setRoleId] = React.useState(roles[0]?.id ?? "");
  const { run, pending } = useAdminAction();
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(() => grantRole(email, roleId), { success: "Role granted", onSuccess: () => setEmail("") });
      }}
    >
      <Field label="Email">
        <Input boxed type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Role">
        <Select boxed value={roleId} onChange={(e) => setRoleId(e.target.value)}>
          {roles.map((r) => <option key={r.id} value={r.id}>{r.name}</option>)}
        </Select>
      </Field>
      <Button type="submit" size="sm" className="w-full" loading={pending}>Grant role</Button>
    </form>
  );
}

export function RevokeChip({ userId, roleId, label }: { userId: string; roleId: string; label: string }) {
  const { run, pending } = useAdminAction();
  return (
    <span className="inline-flex items-center gap-1 bg-champagne/70 py-0.5 pl-2 pr-1 text-[0.7rem] uppercase tracking-[0.1em]">
      {label}
      <button
        disabled={pending}
        onClick={() => window.confirm(`Revoke “${label}”?`) && run(() => revokeRole(userId, roleId), { success: "Role revoked" })}
        className="grid size-4 place-items-center text-ink-mute hover:text-danger disabled:opacity-40"
        aria-label={`Revoke ${label}`}
      >
        <X className="size-3" />
      </button>
    </span>
  );
}
