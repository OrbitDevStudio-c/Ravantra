import { requirePermission } from "@/lib/auth/session";
import { formatINR, formatInTimeZone } from "@/lib/utils";
import { DemoBadge, EmptyRow, PageHeader, StatusBadge, Table, Tabs, Td, Th, THead, Tr } from "@/components/admin/ui";
import { FilterBar } from "@/components/admin/client";
import { Input, Select } from "@/components/ui/primitives";
import { listAdminStylists, listAppointments } from "@/features/admin/salon";
import { str } from "@/features/admin/common";
import { AppointmentControls } from "./appointment-controls";

export const metadata = { title: "Appointments" };

export default async function AppointmentsPage({ searchParams }: PageProps<"/admin/appointments">) {
  await requirePermission("appointments.manage");
  const sp = await searchParams;
  const scope = (["upcoming", "past", "all"] as const).find((s) => s === str(sp.scope)) ?? "upcoming";
  const f = { status: str(sp.status), stylist: str(sp.stylist), date: str(sp.date) };
  const [rows, stylists] = await Promise.all([listAppointments({ scope, ...f }), listAdminStylists()]);
  const stylistOptions = stylists.map((s) => ({ id: s.id, name: s.name, serviceIds: s.serviceIds }));

  const pending = rows.filter((r) => r.status === "pending").length;

  return (
    <>
      <PageHeader
        title="Appointments"
        description="All Salon & Spa bookings in Asia/Kolkata time. Overlaps are impossible — the database rejects double-booking a stylist."
      />
      <Tabs
        active={scope}
        tabs={[
          { key: "upcoming", label: "Upcoming", href: "/admin/appointments" },
          { key: "past", label: "Past", href: "/admin/appointments?scope=past" },
          { key: "all", label: "All", href: "/admin/appointments?scope=all" },
        ]}
      />
      <FilterBar>
        <input type="hidden" name="scope" value={scope} />
        <Select boxed name="status" defaultValue={f.status ?? ""} className="w-40" aria-label="Status">
          <option value="">All statuses</option>
          {["pending", "confirmed", "completed", "cancelled", "no_show"].map((s) => (
            <option key={s} value={s}>{s.replace("_", " ")}</option>
          ))}
        </Select>
        <Select boxed name="stylist" defaultValue={f.stylist ?? ""} className="w-44" aria-label="Stylist">
          <option value="">All stylists</option>
          {stylists.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input boxed type="date" name="date" defaultValue={f.date} className="w-40" aria-label="Date" />
      </FilterBar>
      {scope === "upcoming" && pending > 0 && (
        <p className="mb-3 text-xs text-warning">{pending} booking{pending === 1 ? "" : "s"} awaiting confirmation.</p>
      )}
      <Table>
        <THead>
          <Th>When (IST)</Th>
          <Th>Client</Th>
          <Th>Service</Th>
          <Th>Stylist</Th>
          <Th className="text-right">Price</Th>
          <Th>Status</Th>
          <Th className="text-right">Actions</Th>
        </THead>
        <tbody>
          {rows.length === 0 && <EmptyRow colSpan={7}>No appointments match.</EmptyRow>}
          {rows.map((a) => (
            <Tr key={a.id}>
              <Td className="whitespace-nowrap">
                <p className="font-medium">{formatInTimeZone(a.startsAt, "Asia/Kolkata", "EEE d MMM")}</p>
                <p className="text-xs text-ink-mute tabular-nums">
                  {formatInTimeZone(a.startsAt, "Asia/Kolkata", "h:mm a")} – {formatInTimeZone(a.endsAt, "Asia/Kolkata", "h:mm a")}
                </p>
              </Td>
              <Td>
                <p>{a.customerName}{a.isDemo && <DemoBadge />}</p>
                <p className="text-xs text-ink-mute">{a.customerPhone} · {a.reference}</p>
              </Td>
              <Td>
                <p>{a.serviceName}</p>
                <p className="text-xs text-ink-mute">{a.durationMin} min</p>
              </Td>
              <Td className="text-ink-soft">{a.stylistName}</Td>
              <Td className="text-right tabular-nums">{formatINR(a.price)}</Td>
              <Td><StatusBadge status={a.status} /></Td>
              <Td className="text-right">
                <AppointmentControls
                  appointment={{ id: a.id, status: a.status, startsAt: a.startsAt, stylistId: a.stylistId, serviceId: a.serviceId, label: `${a.serviceName} · ${a.customerName}` }}
                  stylists={stylistOptions}
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
