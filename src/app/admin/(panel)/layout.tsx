import type { Metadata } from "next";
import { AdminShell, type NavGroup } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth/session";
import { can, canGlobal } from "@/lib/auth/permissions";

export const metadata: Metadata = {
  title: { default: "Admin", template: "%s · RAVANTRA Admin" },
  robots: { index: false, follow: false },
};

export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const access = await requireStaff();

  const groups: NavGroup[] = [
    {
      label: "Overview",
      items: [
        { href: "/admin", label: "Dashboard", icon: "dashboard", exact: true },
        ...(can(access, "reports.view") ? [{ href: "/admin/reports", label: "Reports", icon: "reports" }] : []),
      ],
    },
    {
      label: "Commerce",
      items: [
        ...(can(access, "products.manage") ? [{ href: "/admin/products", label: "Products", icon: "products" }] : []),
        ...(can(access, "inventory.manage") ? [{ href: "/admin/inventory", label: "Inventory", icon: "inventory" }] : []),
        ...(can(access, "orders.view") ? [{ href: "/admin/orders", label: "Orders", icon: "orders" }] : []),
      ],
    },
    {
      label: "Salon & Spa",
      items: can(access, "appointments.manage")
        ? [
            { href: "/admin/appointments", label: "Appointments", icon: "appointments" },
            { href: "/admin/services", label: "Services", icon: "salon" },
            { href: "/admin/stylists", label: "Stylists & hours", icon: "stylists" },
          ]
        : [],
    },
    {
      label: "Business",
      items: [
        ...(can(access, "customers.view") ? [{ href: "/admin/customers", label: "Customers", icon: "customers" }] : []),
        ...(can(access, "marketing.manage") ? [{ href: "/admin/marketing", label: "Marketing", icon: "marketing" }] : []),
        ...(canGlobal(access, "divisions.manage") ? [{ href: "/admin/divisions", label: "Divisions", icon: "divisions" }] : []),
        ...(canGlobal(access, "settings.manage") ? [{ href: "/admin/staff", label: "Staff & roles", icon: "staff" }] : []),
      ],
    },
  ].filter((g) => g.items.length > 0);

  const role = access.roles.filter((r) => r.key !== "customer").map((r) => r.name).join(", ") || "Staff";

  return (
    <AdminShell groups={groups} user={{ name: access.name, email: access.email, role }} preview={access.preview}>
      {children}
    </AdminShell>
  );
}
