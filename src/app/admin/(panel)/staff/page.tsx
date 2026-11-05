import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { canGlobal } from "@/lib/auth/permissions";
import { initials } from "@/lib/utils";
import { EmptyRow, PageHeader, Table, Td, Th, THead, Tr } from "@/components/admin/ui";
import { Badge } from "@/components/ui/primitives";
import { getAdminDivisions, divisionName } from "@/features/admin/common";
import { listRoles, listStaff } from "@/features/admin/staff";
import { GrantRoleForm, RevokeChip } from "./staff-controls";

export const metadata = { title: "Staff & roles" };

export default async function StaffPage() {
  const access = await requirePermission("settings.manage");
  if (!canGlobal(access, "settings.manage")) redirect("/admin?denied=settings.manage");
  const [staff, roles, divisions] = await Promise.all([listStaff(), listRoles(), getAdminDivisions()]);
  const assignable = roles.filter((r) => r.key !== "customer");

  return (
    <>
      <PageHeader title="Staff & roles" description="Role-based access is enforced in the database (RLS + security-definer functions); this screen manages who holds which role." />
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Table>
            <THead>
              <Th>Staff member</Th>
              <Th>Roles</Th>
            </THead>
            <tbody>
              {staff.length === 0 && <EmptyRow colSpan={2}>No staff yet.</EmptyRow>}
              {staff.map((s) => (
                <Tr key={s.userId}>
                  <Td>
                    <div className="flex items-center gap-3">
                      <span className="grid size-8 place-items-center rounded-full bg-espresso text-[0.65rem] text-ivory">{initials(s.name || s.email)}</span>
                      <div>
                        <p>{s.name || "—"} {s.userId === access.userId && <Badge tone="outline">You</Badge>}</p>
                        <p className="text-xs text-ink-mute">{s.email}</p>
                      </div>
                    </div>
                  </Td>
                  <Td>
                    <div className="flex flex-wrap gap-1.5">
                      {s.roles.map((r) => <RevokeChip key={r.id} userId={s.userId} roleId={r.id} label={r.name} />)}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
        </div>
        <div className="space-y-6">
          <section className="border border-line bg-white p-5">
            <h2 className="font-serif text-xl">Grant a role</h2>
            <p className="mb-4 mt-1 text-xs text-ink-mute">The person needs an existing RAVANTRA account.</p>
            <GrantRoleForm roles={assignable.map((r) => ({ id: r.id, name: r.name }))} />
          </section>
          <section className="border border-line bg-white p-5">
            <h2 className="mb-3 font-serif text-xl">Role matrix</h2>
            <ul className="space-y-3 text-sm">
              {assignable.map((r) => (
                <li key={r.id}>
                  <p className="font-medium">
                    {r.name} <span className="text-xs font-normal text-ink-mute">{r.divisionId ? `· ${divisionName(divisions, r.divisionId)} only` : "· all divisions"}</span>
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-ink-soft">{r.permissions.join(" · ") || "No permissions"}</p>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </>
  );
}
