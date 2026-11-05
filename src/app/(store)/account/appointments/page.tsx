import type { Metadata } from "next";
import Link from "next/link";
import Image from "@/components/ui/smart-image";
import { CalendarHeart } from "lucide-react";
import { getMyAppointments } from "@/features/account/queries";
import { getStylists } from "@/features/salon/queries";
import { StatusBadge } from "@/components/account/status-badge";
import { AppointmentActions } from "@/components/account/appointment-actions";
import { DemoTag, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatDateTime, formatINR } from "@/lib/utils";

export const metadata: Metadata = { title: "My appointments", robots: { index: false } };

function splitByTime<T extends { starts_at: string; status: string }>(rows: T[], now: number) {
  const upcoming = rows.filter((a) => +new Date(a.starts_at) > now && ["pending", "confirmed"].includes(a.status)).reverse();
  return { upcoming, past: rows.filter((a) => !upcoming.includes(a)) };
}

const currentTime = () => Date.now();

export default async function AppointmentsPage() {
  const [appts, stylists] = await Promise.all([getMyAppointments(), getStylists()]);
  if (!appts.length) {
    return <EmptyState icon={<CalendarHeart className="size-9" strokeWidth={1} />} title="No appointments yet" description="Book hair, skin, bridal and spa services with live availability." action={<Button asChild><Link href="/salon-spa/book">Book an appointment</Link></Button>} />;
  }
  const { upcoming, past } = splitByTime(appts, currentTime());

  const card = (a: (typeof appts)[number], active: boolean) => {
    const st = stylists.find((s) => s.id === a.stylist_id);
    return (
      <li key={a.id} className="grid gap-5 py-6 sm:grid-cols-[88px_1fr_auto] sm:items-center">
        <span className="relative hidden aspect-square overflow-hidden bg-champagne sm:block">
          {a.services?.image && <Image src={a.services.image} alt="" fill sizes="88px" quality={50} className="object-cover" />}
        </span>
        <div>
          <div className="flex flex-wrap items-center gap-3">
            <p className="font-serif text-2xl">{a.services?.name}</p>
            <StatusBadge status={a.status} />
            {a.is_demo && <DemoTag>Demo</DemoTag>}
          </div>
          <p className="mt-1 text-sm text-ink-soft">with {a.stylists?.name} · {formatDateTime(a.starts_at)} IST</p>
          <p className="mt-1 text-xs text-ink-mute">Ref {a.reference} · {formatINR(a.price)} · pay at salon</p>
        </div>
        {active && st && a.services && (
          <AppointmentActions id={a.id} serviceId={a.service_id} stylistId={a.stylist_id} workingHours={st.workingHours} startsAt={a.starts_at} />
        )}
      </li>
    );
  };

  return (
    <div className="space-y-14">
      <section>
        <div className="flex items-baseline justify-between border-b border-line pb-4">
          <h2 className="font-serif text-3xl">Upcoming</h2>
          <Link href="/salon-spa/book" className="text-xs uppercase tracking-[0.16em] underline-offset-4 hover:underline">Book new</Link>
        </div>
        {upcoming.length ? <ul className="divide-y divide-line">{upcoming.map((a) => card(a, true))}</ul> : <p className="mt-6 text-sm text-ink-soft">Nothing scheduled.</p>}
      </section>
      {past.length > 0 && (
        <section>
          <h2 className="border-b border-line pb-4 font-serif text-3xl">History</h2>
          <ul className="divide-y divide-line opacity-80">{past.map((a) => card(a, false))}</ul>
        </section>
      )}
    </div>
  );
}
