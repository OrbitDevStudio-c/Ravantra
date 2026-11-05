import { redirect } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { canGlobal } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/admin/ui";
import { DivisionForm } from "../division-form";

export const metadata = { title: "New division" };

export default async function NewDivisionPage() {
  const access = await requirePermission("divisions.manage");
  if (!canGlobal(access, "divisions.manage")) redirect("/admin?denied=divisions.manage");
  return (
    <>
      <PageHeader back={{ href: "/admin/divisions", label: "Divisions" }} title="New division" description="Product divisions appear at /your-slug with their own catalogue; service divisions take appointments." />
      <div className="max-w-4xl">
        <DivisionForm
          initial={{ name: "", shortName: "", slug: "", tagline: "", description: "", kind: "products", accentColor: "#B69A72", heroImage: "", bannerImage: "", logoUrl: "", sortOrder: 10, isActive: false }}
        />
      </div>
    </>
  );
}
