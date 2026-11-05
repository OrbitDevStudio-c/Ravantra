import Image from "next/image";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { scopedDivisions } from "@/lib/auth/permissions";
import { formatINR } from "@/lib/utils";
import { EmptyRow, PageHeader, Table, Td, Th, THead, Tr } from "@/components/admin/ui";
import { ActionToggle, FilterBar } from "@/components/admin/client";
import { Badge, Input, Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { listAdminProducts } from "@/features/admin/products";
import { setProductFlag } from "@/features/admin/product-actions";
import { divisionName, getAdminCategories, getAdminDivisions, str } from "@/features/admin/common";

export const metadata = { title: "Products" };

export default async function ProductsPage({ searchParams }: PageProps<"/admin/products">) {
  const access = await requirePermission("products.manage");
  const sp = await searchParams;
  const scope = scopedDivisions(access, "products.manage");
  const f = { q: str(sp.q), division: str(sp.division), category: str(sp.category), status: str(sp.status), stock: str(sp.stock) };
  const [products, divisions, categories] = await Promise.all([listAdminProducts({ ...f, divisionScope: scope }), getAdminDivisions(), getAdminCategories()]);
  const myDivisions = divisions.filter((d) => d.kind === "products" && (!scope || scope.includes(d.id)));
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <>
      <PageHeader
        title="Products"
        description={`${products.length} products${scope ? " in your divisions" : " across all divisions"}.`}
        actions={
          <>
            <Button variant="outline" size="sm" asChild><Link href="/admin/products/categories">Categories</Link></Button>
            <Button size="sm" asChild><Link href="/admin/products/new">Add product</Link></Button>
          </>
        }
      />
      <FilterBar>
        <Input boxed name="q" defaultValue={f.q} placeholder="Name or SKU" className="w-56" aria-label="Search" />
        <Select boxed name="division" defaultValue={f.division ?? ""} className="w-44" aria-label="Division">
          <option value="">All divisions</option>
          {myDivisions.map((d) => <option key={d.id} value={d.id}>{d.shortName}</option>)}
        </Select>
        <Select boxed name="category" defaultValue={f.category ?? ""} className="w-44" aria-label="Category">
          <option value="">All categories</option>
          {categories.filter((c) => myDivisions.some((d) => d.id === c.divisionId) && (!f.division || c.divisionId === f.division)).map((c) => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </Select>
        <Select boxed name="status" defaultValue={f.status ?? ""} className="w-36" aria-label="Status">
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="featured">Featured</option>
        </Select>
        <Select boxed name="stock" defaultValue={f.stock ?? ""} className="w-36" aria-label="Stock">
          <option value="">Any stock</option>
          <option value="low">Low stock</option>
          <option value="out">Out of stock</option>
        </Select>
      </FilterBar>

      <Table>
        <THead>
          <Th>Product</Th>
          <Th>Division / category</Th>
          <Th className="text-right">Price</Th>
          <Th className="text-right">Variants</Th>
          <Th className="text-right">Stock</Th>
          <Th>Featured</Th>
          <Th>Active</Th>
        </THead>
        <tbody>
          {products.length === 0 && <EmptyRow colSpan={7}>No products match. <Link href="/admin/products/new" className="underline">Add one</Link>.</EmptyRow>}
          {products.map((p) => {
            const stock = p.variants.reduce((a, v) => a + v.stock, 0);
            return (
              <Tr key={p.id}>
                <Td>
                  <Link href={`/admin/products/${p.id}`} className="flex items-center gap-3">
                    <div className="relative h-12 w-9 shrink-0 overflow-hidden bg-champagne">
                      {p.images[0] && <Image src={p.images[0].url} alt="" fill sizes="36px" className="object-cover" quality={60} />}
                    </div>
                    <div className="min-w-0">
                      <p className="truncate font-medium hover:underline">{p.name}</p>
                      <p className="font-mono text-[0.68rem] text-ink-mute">{p.sku}</p>
                    </div>
                    {p.isNew && <Badge tone="gold">New</Badge>}
                  </Link>
                </Td>
                <Td className="text-xs text-ink-soft">
                  {divisionName(divisions, p.divisionId)} · {catName.get(p.categoryId) ?? "—"}
                </Td>
                <Td className="text-right tabular-nums">
                  {p.salePrice ? (
                    <>
                      {formatINR(p.salePrice)} <span className="text-xs text-ink-mute line-through">{formatINR(p.price)}</span>
                    </>
                  ) : (
                    formatINR(p.price)
                  )}
                </Td>
                <Td className="text-right tabular-nums">{p.variants.length}</Td>
                <Td className={`text-right tabular-nums ${stock === 0 ? "text-danger" : p.variants.some((v) => v.stock <= 3) ? "text-warning" : ""}`}>{stock}</Td>
                <Td><ActionToggle checked={p.isFeatured} label={`Feature ${p.name}`} action={setProductFlag.bind(null, p.id, "is_featured")} /></Td>
                <Td><ActionToggle checked={p.isActive} label={`Activate ${p.name}`} action={setProductFlag.bind(null, p.id, "is_active")} /></Td>
              </Tr>
            );
          })}
        </tbody>
      </Table>
    </>
  );
}
