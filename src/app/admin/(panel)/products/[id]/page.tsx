import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { can, scopedDivisions } from "@/lib/auth/permissions";
import { PageHeader } from "@/components/admin/ui";
import { getAdminCategories, getAdminDivisions } from "@/features/admin/common";
import { getAdminProduct } from "@/features/admin/products";
import { ProductForm } from "../product-form";

export const metadata = { title: "Edit product" };

export default async function EditProductPage({ params }: PageProps<"/admin/products/[id]">) {
  const access = await requirePermission("products.manage");
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [product, divisions, categories] = await Promise.all([getAdminProduct(id), getAdminDivisions(), getAdminCategories()]);
  if (!product) notFound();
  const scope = scopedDivisions(access, "products.manage");
  if (scope && !scope.includes(product.divisionId)) notFound();
  const allowed = divisions.filter((d) => d.kind === "products" && (!scope || scope.includes(d.id)));
  const s = (n: number | null) => (n == null ? "" : String(n));

  return (
    <>
      <PageHeader
        back={{ href: "/admin/products", label: "Products" }}
        eyebrow={product.sku}
        title={product.name}
        actions={
          <Link href={`/products/${product.slug}`} target="_blank" className="text-xs uppercase tracking-[0.14em] text-ink-soft hover:text-espresso">
            View on store ↗
          </Link>
        }
      />
      <ProductForm
        canSetStock={can(access, "inventory.manage")}
        divisions={allowed.map((d) => ({ id: d.id, name: d.shortName }))}
        categories={categories.map((c) => ({ id: c.id, name: c.name, divisionId: c.divisionId }))}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          divisionId: product.divisionId,
          categoryId: product.categoryId,
          sku: product.sku,
          price: String(product.price),
          salePrice: s(product.salePrice),
          shortDescription: product.shortDescription,
          description: product.description,
          ingredients: product.ingredients ?? "",
          highlights: product.highlights.join("\n"),
          tags: product.tags.join(", "),
          isFeatured: product.isFeatured,
          isNew: product.isNew,
          isActive: product.isActive,
          images: product.images.map((i) => ({ id: i.id, url: i.url, alt: i.alt })),
          variants: product.variants.map((v) => ({
            id: v.id,
            sku: v.sku,
            size: v.size ?? "",
            color: v.color ?? "",
            colorHex: v.colorHex ?? "",
            volume: v.volume ?? "",
            price: s(v.price),
            salePrice: s(v.salePrice),
            isActive: v.isActive,
            openingStock: "",
          })),
        }}
      />
    </>
  );
}
