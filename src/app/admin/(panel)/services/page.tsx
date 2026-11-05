import Image from "next/image";
import { requirePermission } from "@/lib/auth/session";
import { formatINR } from "@/lib/utils";
import { EmptyRow, PageHeader, StatusBadge, Table, Td, Th, THead, Tr } from "@/components/admin/ui";
import { Badge } from "@/components/ui/primitives";
import { getSalonDivisions, listAdminServices, listAdminStylists } from "@/features/admin/salon";
import { ServiceEditor } from "./service-editor";

export const metadata = { title: "Services" };

export default async function ServicesPage() {
  await requirePermission("appointments.manage");
  const [services, stylists, divisions] = await Promise.all([listAdminServices(), listAdminStylists(), getSalonDivisions()]);
  const divs = divisions.map((d) => ({ id: d.id, name: d.shortName }));

  return (
    <>
      <PageHeader title="Services" description="The Salon & Spa menu. Duration drives slot length in booking; prices are charged at the salon." actions={<ServiceEditor divisions={divs} />} />
      <Table>
        <THead>
          <Th>Service</Th>
          <Th>Category</Th>
          <Th className="text-right">Duration</Th>
          <Th className="text-right">Price</Th>
          <Th className="text-right">Specialists</Th>
          <Th>Status</Th>
          <Th className="text-right">Edit</Th>
        </THead>
        <tbody>
          {services.length === 0 && <EmptyRow colSpan={7}>No services yet.</EmptyRow>}
          {services.map((s) => (
            <Tr key={s.id}>
              <Td>
                <div className="flex items-center gap-3">
                  <div className="relative size-10 shrink-0 overflow-hidden bg-champagne">
                    {s.image && <Image src={s.image} alt="" fill sizes="40px" className="object-cover" quality={60} />}
                  </div>
                  <div className="min-w-0">
                    <p>{s.name} {s.isPopular && <Badge tone="gold" className="ml-1">Popular</Badge>}</p>
                    <p className="max-w-md truncate text-xs text-ink-mute">{s.description}</p>
                  </div>
                </div>
              </Td>
              <Td className="text-ink-soft">{s.category}</Td>
              <Td className="text-right tabular-nums">{s.durationMin} min</Td>
              <Td className="text-right tabular-nums">{formatINR(s.price)}</Td>
              <Td className="text-right tabular-nums">{stylists.filter((st) => st.serviceIds.includes(s.id)).length}</Td>
              <Td><StatusBadge status={s.isActive ? "active" : "inactive"} /></Td>
              <Td className="text-right">
                <ServiceEditor
                  divisions={divs}
                  initial={{ id: s.id, divisionId: s.divisionId, slug: s.slug, category: s.category, name: s.name, description: s.description, durationMin: s.durationMin, price: s.price, image: s.image, isPopular: s.isPopular, isActive: s.isActive }}
                />
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
    </>
  );
}
