import type { Metadata } from "next";
import { AdminShell, type AdminNotice, type NavGroup } from "@/components/admin/admin-shell";
import { requireStaff } from "@/lib/auth/session";
import { can, canGlobal } from "@/lib/auth/permissions";
import { getOverview, safe } from "@/features/analytics/queries";

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
        ...(can(access, "dashboard.view") ? [{ href: "/admin/assistant", label: "AI assistant", icon: "assistant" }] : []),
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

  // Live, role-scoped attention items (one RPC; never blocks the page if it fails)
  const overview = await safe(getOverview(30), null);
  const notices: AdminNotice[] = [];
  if (overview?.canSeeSales && overview.pendingOrders > 0 && can(access, "orders.view"))
    notices.push({ id: "orders", tone: "warning", title: `${overview.pendingOrders} order${overview.pendingOrders === 1 ? "" : "s"} to fulfil`, body: "Confirmed and awaiting dispatch", href: "/admin/orders?status=confirmed" });
  if (overview?.canSeeStock && overview.lowStock > 0 && can(access, "inventory.manage"))
    notices.push({ id: "stock", tone: "danger", title: `${overview.lowStock} variant${overview.lowStock === 1 ? "" : "s"} low on stock`, body: "At or below the alert threshold", href: "/admin/inventory?stock=alert" });
  if (overview?.canSeeSalon && overview.appointmentsUpcoming > 0 && can(access, "appointments.manage"))
    notices.push({ id: "appts", tone: "info", title: `${overview.appointmentsUpcoming} upcoming appointment${overview.appointmentsUpcoming === 1 ? "" : "s"}`, body: "Salon & Spa schedule", href: "/admin/appointments" });

  return (
    <AdminShell groups={groups} user={{ name: access.name, email: access.email, role }} preview={access.preview} notices={notices}>
      {children}
    </AdminShell>
  );
}
