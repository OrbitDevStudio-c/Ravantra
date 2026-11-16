"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { cancelMyAppointment, rescheduleMyAppointment } from "@/features/appointments/actions";
import { SlotPicker } from "@/components/booking/slot-picker";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import type { Slot } from "@/features/salon/slots";
import type { WorkingHour } from "@/types";

export function AppointmentActions({ id, serviceId, stylistId, workingHours, startsAt }: { id: string; serviceId: string; stylistId: string; workingHours: WorkingHour[]; startsAt: string }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [when, setWhen] = React.useState<{ date: string; slot: Slot | null }>({ date: "", slot: null });
  const [busy, setBusy] = React.useState<string | null>(null);
  const [locked] = React.useState(() => new Date(startsAt).getTime() - Date.now() < 4 * 3600 * 1000);

  const cancel = async () => {
    if (!confirm("Cancel this appointment?")) return;
    setBusy("cancel");
    const res = await cancelMyAppointment(id);
    setBusy(null);
    if (res.ok) {
      toast.success("Appointment cancelled.");
      router.refresh();
    } else toast.error(res.error);
  };

  const reschedule = async () => {
    if (!when.slot) return;
    setBusy("move");
    const res = await rescheduleMyAppointment(id, when.slot.startsAt);
    setBusy(null);
    if (res.ok) {
      toast.success("Rescheduled — we'll confirm shortly.");
      setOpen(false);
      router.refresh();
    } else toast.error(res.error);
  };

  if (locked) return <p className="text-xs text-ink-mute">Changes close 4 hrs before</p>;

  return (
    <div className="flex gap-2">
      <Button size="sm" variant="outline" onClick={() => setOpen(true)}>Reschedule</Button>
      <Button size="sm" variant="ghost" className="text-danger" onClick={cancel} loading={busy === "cancel"}>Cancel</Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="center" title="Reschedule appointment" className="max-h-[90dvh] max-w-2xl overflow-y-auto p-6 md:p-8">
          <h2 className="font-serif text-3xl">Choose a new time</h2>
          <div className="mt-6">
            <SlotPicker serviceId={serviceId} stylistId={stylistId} workingHours={workingHours} value={when} onChange={setWhen} />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setOpen(false)}>Keep current time</Button>
            <Button disabled={!when.slot} loading={busy === "move"} onClick={reschedule}>Confirm new time</Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
