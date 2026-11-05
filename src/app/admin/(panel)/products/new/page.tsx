import { requirePermission } from "@/lib/auth/session";
import { can, scopedDivisions } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/admin/ui";
import { getAdminCategories, getAdminDivisions } from "@/features/admin/common";
import { ProductForm } from "../product-form";

export const metadata = { title: "New product" };

export default async function NewProductPage({ searchParams }: PageProps<"/admin/products/new">) {
  const access = await requirePermission("products.manage");
  const sp = await searchParams;
  const scope = scopedDivisions(access, "products.manage");
  const [divisions, categories] = await Promise.all([getAdminDivisions(), getAdminCategories()]);
  const allowed = divisions.filter((d) => d.kind === "products" && (!scope || scope.includes(d.id)));
  const pre = typeof sp.division === "string" && allowed.some((d) => d.id === sp.division) ? sp.division : allowed.length === 1 ? allowed[0].id : "";

  return (
    <>
      <PageHeader back={{ href: "/admin/products", label: "Products" }} title="New product" description="Products are created in a division and category, then stocked per variant." />
      <ProductForm
        canSetStock={can(access, "inventory.manage")}
        divisions={allowed.map((d) => ({ id: d.id, name: d.shortName }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, divisionId: c.divisionId }))}
        initial={{
          name: "",
          slug: "",
          divisionId: pre,
          categoryId: "",
          sku: "",
          price: "",
          salePrice: "",
          shortDescription: "",
          description: "",
          ingredients: "",
          highlights: "",
          tags: "",
          isFeatured: false,
          isNew: true,
          isActive: true,
          images: [],
          variants: [{ sku: "", size: "", color: "", colorHex: "", volume: "", price: "", salePrice: "", isActive: true, openingStock: "" }],
        }}
      />
    </>
  );
}
