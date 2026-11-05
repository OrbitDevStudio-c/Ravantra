"use client";

import * as React from "react";
import { MoreHorizontal } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/primitives";
import { Modal, useAdminAction } from "@/components/admin/client";
import { getRescheduleSlots, rescheduleAppointment, setAppointmentStatus } from "@/features/admin/salon-actions";
import type { Slot } from "@/features/salon/slots";
import { cn } from "@/lib/utils";

type Appt = { id: string; status: string; startsAt: string; stylistId: string; serviceId: string; label: string };

export function AppointmentControls({ appointment: a, stylists }: { appointment: Appt; stylists: { id: string; name: string; serviceIds: string[] }[] }) {
  const { run, pending } = useAdminAction();
  const [menu, setMenu] = React.useState(false);
  const [resched, setResched] = React.useState(false);
  const future = isFuture(a.startsAt);
  const active = a.status === "pending" || a.status === "confirmed";

  const act = (status: string, msg: string, confirmText?: string) => {
    setMenu(false);
    if (confirmText && !window.confirm(confirmText)) return;
    run(() => setAppointmentStatus(a.id, status), { success: msg });
  };

  return (
    <div className="relative inline-flex items-center gap-1.5">
      {a.status === "pending" && (
        <Button size="sm" loading={pending} onClick={() => act("confirmed", "Appointment confirmed")}>Confirm</Button>
      )}
      {a.status === "confirmed" && !future && (
        <Button size="sm" variant="outline" loading={pending} onClick={() => act("completed", "Marked completed")}>Complete</Button>
      )}
      <button
        className="grid size-8 place-items-center border border-line bg-white hover:border-espresso"
        aria-label="More actions"
        aria-expanded={menu}
        onClick={() => setMenu((m) => !m)}
        onBlur={() => setTimeout(() => setMenu(false), 150)}
      >
        <MoreHorizontal className="size-4" />
      </button>
      {menu && (
        <ul className="absolute right-0 top-9 z-20 w-48 border border-line bg-white py-1 text-left text-sm shadow-lg">
          {active && <MenuItem onClick={() => { setMenu(false); setResched(true); }}>Reschedule…</MenuItem>}
          {a.status === "confirmed" && <MenuItem onClick={() => act("completed", "Marked completed")}>Mark completed</MenuItem>}
          {active && !future && <MenuItem onClick={() => act("no_show", "Marked no-show")}>Mark no-show</MenuItem>}
          {active && <MenuItem danger onClick={() => act("cancelled", "Appointment cancelled", "Cancel this appointment? The client will be notified by email if configured.")}>Cancel appointment</MenuItem>}
          {!active && future && <MenuItem onClick={() => act("confirmed", "Appointment re-activated")}>Re-activate</MenuItem>}
          {!active && !future && <li className="px-3 py-2 text-xs text-ink-mute">No further actions</li>}
        </ul>
      )}
      <Modal open={resched} onOpenChange={setResched} title="Reschedule appointment">
        {resched && <Reschedule appt={a} stylists={stylists.filter((s) => s.serviceIds.includes(a.serviceId))} onDone={() => setResched(false)} />}
      </Modal>
    </div>
  );
}

function MenuItem({ children, onClick, danger }: { children: React.ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <li>
      <button onMouseDown={(e) => e.preventDefault()} onClick={onClick} className={cn("w-full px-3 py-2 text-left hover:bg-ivory", danger && "text-danger")}>
        {children}
      </button>
    </li>
  );
}

function isFuture(iso: string) {
  return +new Date(iso) > Date.now();
}

function todayIst() {
  return istDate(new Date().toISOString());
}

function istDate(iso: string) {
  return new Date(new Date(iso).getTime() + 330 * 60000).toISOString().slice(0, 10);
}

function Reschedule({ appt, stylists, onDone }: { appt: Appt; stylists: { id: string; name: string }[]; onDone: () => void }) {
  const [stylist, setStylist] = React.useState(appt.stylistId);
  const [today] = React.useState(todayIst);
  const [date, setDate] = React.useState(() => (istDate(appt.startsAt) < today ? today : istDate(appt.startsAt)));
  const key = `${stylist}|${date}`;
  const [result, setResult] = React.useState<{ key: string; slots: Slot[] } | null>(null);
  const [picked, setPicked] = React.useState<{ key: string; at: string } | null>(null);
  const { run, pending } = useAdminAction();
  const loading = result?.key !== key;
  const slots = loading ? null : result.slots;
  const chosen = picked?.key === key ? picked.at : null;
  const setChosen = (at: string) => setPicked({ key, at });

  React.useEffect(() => {
    let cancelled = false;
    getRescheduleSlots(appt.id, stylist, date).then((res) => {
      if (cancelled) return;
      if (!res.ok) toast.error(res.error);
      setResult({ key: `${stylist}|${date}`, slots: res.ok ? res.data ?? [] : [] });
    });
    return () => {
      cancelled = true;
    };
  }, [appt.id, stylist, date]);

  return (
    <div>
      <p className="mb-4 text-sm text-ink-soft">{appt.label}</p>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Stylist">
          <Select boxed value={stylist} onChange={(e) => setStylist(e.target.value)}>
            {stylists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <Field label="Date (IST)">
          <Input boxed type="date" value={date} min={today} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <div className="mt-5 min-h-24">
        {loading ? (
          <div className="grid grid-cols-4 gap-2">{Array.from({ length: 8 }).map((_, i) => <div key={i} className="skeleton h-9" />)}</div>
        ) : slots && slots.length === 0 ? (
          <p className="text-sm text-ink-mute">The stylist isn&apos;t working this day.</p>
        ) : (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {slots?.map((s) => (
              <button
                key={s.startsAt}
                disabled={!s.available}
                onClick={() => setChosen(s.startsAt)}
                className={cn(
                  "border py-2 text-xs tabular-nums transition",
                  chosen === s.startsAt ? "border-espresso bg-espresso text-ivory" : "border-line bg-white hover:border-espresso",
                  !s.available && "cursor-not-allowed opacity-30 line-through hover:border-line",
                )}
              >
                {s.label}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <Button variant="ghost" size="sm" onClick={onDone}>Cancel</Button>
        <Button size="sm" disabled={!chosen} loading={pending} onClick={() => chosen && run(() => rescheduleAppointment(appt.id, chosen, stylist), { success: "Appointment rescheduled", onSuccess: onDone })}>
          Move appointment
        </Button>
      </div>
    </div>
  );
}
