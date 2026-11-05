import Image from "@/components/ui/smart-image";
import Link from "next/link";
import type { ProductWithRelations } from "@/types";
import { productFromPrice, productStock, variantLabel, variantPricing } from "@/features/catalog/pricing";
import { cn, discountPercent, formatINR } from "@/lib/utils";
import { WishlistButton } from "./wishlist-button";
import { QuickAdd, type QuickAddProduct } from "./quick-add";

export function toQuickAdd(p: ProductWithRelations): QuickAddProduct {
  return {
    productId: p.id,
    slug: p.slug,
    name: p.name,
    image: p.images[0]?.url ?? "",
    division: p.division.shortName,
    variants: p.variants
      .filter((v) => v.isActive)
      .map((v) => {
        const pr = variantPricing(p, v);
        return { id: v.id, label: variantLabel(v), short: v.size ?? v.volume ?? v.color ?? v.name, stock: v.stock, price: pr.price, compareAt: pr.compareAt };
      }),
  };
}

export function ProductCard({
  product,
  priority,
  sizes = "(min-width:1280px) 22vw, (min-width:768px) 30vw, 48vw",
  className,
  index,
}: {
  product: ProductWithRelations;
  priority?: boolean;
  sizes?: string;
  className?: string;
  index?: number;
}) {
  const { price, compareAt } = productFromPrice(product);
  const off = compareAt ? discountPercent(compareAt, price) : 0;
  const soldOut = productStock(product) === 0;
  const swatches = [...new Map(product.variants.filter((v) => v.colorHex).map((v) => [v.color, v.colorHex!])).entries()];
  const [img1, img2] = product.images;

  return (
    <article className={cn("group relative", className)}>
      <div className="relative aspect-[3/4] overflow-hidden bg-champagne/60">
        <Link href={`/products/${product.slug}`} aria-label={product.name} className="img-zoom absolute inset-0 block">
          {img1 && (
            <Image
              src={img1.url}
              alt={img1.alt || product.name}
              fill
              sizes={sizes}
              priority={priority}
              quality={60}
              className={cn("object-cover", img2 && "md:group-hover:opacity-0")}
            />
          )}
          {img2 && (
            <Image src={img2.url} alt="" fill sizes={sizes} quality={60} loading="lazy" className="hidden object-cover opacity-0 md:block md:group-hover:opacity-100" />
          )}
        </Link>

        <div className="pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut ? (
            <span className="bg-ivory/95 px-2 py-1 text-[0.6rem] uppercase tracking-[0.16em]">Sold out</span>
          ) : (
            <>
              {product.isNew && <span className="bg-ivory/95 px-2 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-espresso">New</span>}
              {off > 0 && <span className="bg-espresso px-2 py-1 text-[0.6rem] uppercase tracking-[0.16em] text-ivory">−{off}%</span>}
            </>
          )}
        </div>
        {typeof index === "number" && (
          <span className="pointer-events-none absolute bottom-3 left-3 font-serif text-sm italic text-ivory mix-blend-difference md:hidden">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}

        <WishlistButton productId={product.id} name={product.name} className="absolute right-2 top-2" />
        {!soldOut && <QuickAdd product={toQuickAdd(product)} />}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="eyebrow text-[0.6rem] text-mocha">
            {product.division.shortName}
            <span className="mx-1.5 text-line-strong">/</span>
            {product.category.name}
          </p>
          <h3 className="mt-1.5 text-[0.95rem] leading-snug text-espresso">
            <Link href={`/products/${product.slug}`} className="hover:underline hover:underline-offset-4">{product.name}</Link>
          </h3>
        </div>
        {swatches.length > 1 && (
          <div className="mt-1 flex shrink-0 -space-x-1" aria-label={`${swatches.length} colours`}>
            {swatches.slice(0, 4).map(([name, hex]) => (
              <span key={name} title={name ?? ""} className="size-3 rounded-full border border-ivory ring-1 ring-line" style={{ backgroundColor: hex }} />
            ))}
          </div>
        )}
      </div>
      <p className="mt-1.5 flex items-baseline gap-2 text-sm">
        <span className="text-espresso">{formatINR(price)}</span>
        {compareAt && <span className="text-ink-mute line-through">{formatINR(compareAt)}</span>}
      </p>
    </article>
  );
}
