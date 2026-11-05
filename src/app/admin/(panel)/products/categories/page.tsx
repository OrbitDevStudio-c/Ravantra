import Image from "next/image";
import { requirePermission } from "@/lib/auth/session";
import { scopedDivisions } from "@/lib/auth/permissions";
import { EmptyRow, PageHeader, StatusBadge, Table, Td, Th, THead, Tr } from "@/components/admin/ui";
import { Badge } from "@/components/ui/primitives";
import { getAdminCategories, getAdminDivisions } from "@/features/admin/common";
import { listAdminProducts } from "@/features/admin/products";
import { CategoryEditor } from "./category-editor";

export const metadata = { title: "Categories" };

export default async function CategoriesPage() {
  const access = await requirePermission("products.manage");
  const scope = scopedDivisions(access, "products.manage");
  const [divisions, categories, products] = await Promise.all([getAdminDivisions(), getAdminCategories(), listAdminProducts({ divisionScope: scope })]);
  const allowed = divisions.filter((d) => d.kind === "products" && (!scope || scope.includes(d.id)));
  const counts = new Map<string, number>();
  products.forEach((p) => counts.set(p.categoryId, (counts.get(p.categoryId) ?? 0) + 1));
  const divOptions = allowed.map((d) => ({ id: d.id, name: d.shortName }));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        title="Categories"
        description="Categories organise each division's catalogue and power storefront filters."
        actions={<CategoryEditor divisions={divOptions} />}
      />
      {allowed.map((d) => {
        const cats = categories.filter((c) => c.divisionId === d.id);
        return (
          <section key={d.id} className="mb-8">
            <h2 className="mb-3 flex items-center gap-2 font-serif text-xl">
              <span className="size-2.5 rounded-full" style={{ background: d.accentColor }} aria-hidden />
              {d.shortName}
            </h2>
            <Table>
              <THead>
                <Th>Category</Th>
                <Th>Slug</Th>
                <Th className="text-right">Products</Th>
                <Th className="text-right">Order</Th>
                <Th>Status</Th>
                <Th className="text-right">Edit</Th>
              </THead>
              <tbody>
                {cats.length === 0 && <EmptyRow colSpan={6}>No categories yet.</EmptyRow>}
                {cats.map((c) => (
                  <Tr key={c.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <div className="relative size-9 shrink-0 overflow-hidden bg-champagne">
                          {c.image && <Image src={c.image} alt="" fill sizes="36px" className="object-cover" quality={60} />}
                        </div>
                        <div>
                          <p>{c.name} {c.isFeatured && <Badge tone="gold" className="ml-1">Featured</Badge>}</p>
                          <p className="text-xs text-ink-mute">{c.description}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="font-mono text-xs">{c.slug}</Td>
                    <Td className="text-right tabular-nums">{counts.get(c.id) ?? 0}</Td>
                    <Td className="text-right tabular-nums">{c.sortOrder}</Td>
                    <Td><StatusBadge status={c.isActive ? "active" : "inactive"} /></Td>
                    <Td className="text-right">
                      <CategoryEditor
                        divisions={divOptions}
                        initial={{
                          id: c.id,
                          divisionId: c.divisionId,
                          name: c.name,
                          slug: c.slug,
                          description: c.description ?? "",
                          image: c.image ?? "",
                          sortOrder: c.sortOrder,
                          isFeatured: c.isFeatured,
                          isActive: c.isActive,
                        }}
                      />
                    </Td>
                  </Tr>
                ))}
              </tbody>
            </Table>
          </section>
        );
      })}
    </>
  );
}
