import Image from "next/image";
import { requirePermission } from "@/lib/auth/session";
import { formatInTimeZone } from "@/lib/utils";
import { PageHeader, Panel, StatusBadge } from "@/components/admin/ui";
import { ActionButton } from "@/components/admin/client";
import { getSalonDivisions, listAdminServices, listAdminStylists, listBlockedSlots } from "@/features/admin/salon";
import { removeBlockedSlot } from "@/features/admin/salon-actions";
import { BlockSlotForm, StylistEditor } from "./stylist-editor";

export const metadata = { title: "Stylists & hours" };

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default async function StylistsPage() {
  await requirePermission("appointments.manage");
  const [stylists, services, divisions, blocks] = await Promise.all([listAdminStylists(), listAdminServices(), getSalonDivisions(), listBlockedSlots()]);
  const divs = divisions.map((d) => ({ id: d.id, name: d.shortName }));
  const svc = services.map((s) => ({ id: s.id, name: s.name, category: s.category }));

  return (
    <>
      <PageHeader title="Stylists & availability" description="Specialist profiles, the services each one performs, weekly working hours (IST) and blocked time." actions={<StylistEditor divisions={divs} services={svc} />} />

      <div className="grid gap-4 lg:grid-cols-2">
        {stylists.map((s) => (
          <article key={s.id} className="flex gap-4 border border-line bg-white p-4">
            <div className="relative h-28 w-24 shrink-0 overflow-hidden bg-champagne">
              {s.image && <Image src={s.image} alt="" fill sizes="96px" className="object-cover" quality={60} />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="font-serif text-xl leading-tight">{s.name}</h2>
                  <p className="text-xs text-mocha">{s.title} · {s.experienceYears} yrs</p>
                </div>
                <div className="flex items-center gap-1">
                  <StatusBadge status={s.isActive ? "active" : "inactive"} />
                  <StylistEditor
                    divisions={divs}
                    services={svc}
                    initial={{
                      id: s.id,
                      divisionId: s.divisionId,
                      slug: s.slug,
                      name: s.name,
                      title: s.title,
                      bio: s.bio,
                      image: s.image,
                      specialties: s.specialties.join(", "),
                      experienceYears: s.experienceYears,
                      isActive: s.isActive,
                      serviceIds: s.serviceIds,
                      hours: s.workingHours,
                    }}
                  />
                </div>
              </div>
              <p className="mt-2 text-xs text-ink-soft">{services.filter((x) => s.serviceIds.includes(x.id)).map((x) => x.name).join(" · ") || "No services assigned"}</p>
              <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[0.62rem]">
                {DAYS.map((d, i) => {
                  const wh = s.workingHours.find((w) => w.weekday === i);
                  return (
                    <div key={d} className={wh ? "bg-sage/10 py-1 text-espresso" : "bg-ivory-2 py-1 text-ink-mute"}>
                      <p className="font-medium">{d}</p>
                      <p className="tabular-nums">{wh ? `${wh.startTime}–${wh.endTime}` : "Off"}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        ))}
      </div>

      <Panel title="Blocked time" className="mt-8" action={<BlockSlotForm stylists={stylists.map((s) => ({ id: s.id, name: s.name }))} />} padded={false}>
        {blocks.length === 0 ? (
          <p className="px-5 py-8 text-center text-sm text-ink-mute">No upcoming blocked time. Block slots for training, leave or private events.</p>
        ) : (
          <ul className="divide-y divide-line">
            {blocks.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                <div>
                  <p>{stylists.find((s) => s.id === b.stylistId)?.name ?? "Stylist"} — {b.reason ?? "Blocked"}</p>
                  <p className="text-xs text-ink-mute tabular-nums">
                    {formatInTimeZone(b.startsAt, "Asia/Kolkata", "EEE d MMM, h:mm a")} – {formatInTimeZone(b.endsAt, "Asia/Kolkata", "h:mm a")}
                  </p>
                </div>
                <ActionButton size="sm" variant="ghost" action={removeBlockedSlot.bind(null, b.id)} confirm="Remove this blocked time?" success="Blocked time removed">
                  Remove
                </ActionButton>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
