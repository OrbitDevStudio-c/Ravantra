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
  const active = product.variants.filter((v) => v.isActive);
  const swatches = [...new Map(active.filter((v) => v.colorHex).map((v) => [v.color, v.colorHex!])).entries()];
  const stockSizes = [...new Set(active.filter((v) => v.size && v.stock > 0).map((v) => v.size!))];
  const brand = product.division.subBrand ?? product.division.shortName;
  const [img1, img2] = product.images;

  return (
    <article className={cn("group relative h-full bg-plum pb-4 ring-1 ring-transparent transition-[box-shadow,--tw-ring-color] duration-500 hover:shadow-[0_22px_50px_-26px_rgb(200_184_240/0.35)] hover:ring-lavender/30", className)}>
      <div className="relative aspect-[3/4] overflow-hidden bg-rose-soft">
        <Link href={`/products/${product.slug}`} aria-label={product.name} className="img-zoom absolute inset-0 block">
          {img1 && (
            <Image
              src={img1.url}
              alt={img1.alt || product.name}
              fill
              sizes={sizes}
              priority={priority}
              quality={60}
              className={cn("object-cover transition-opacity duration-700", img2 && "md:group-hover:opacity-0")}
            />
          )}
          {img2 && (
            <Image src={img2.url} alt="" fill sizes={sizes} quality={60} loading="lazy" className="hidden object-cover opacity-0 transition-opacity duration-700 md:block md:group-hover:opacity-100" />
          )}
        </Link>

        <div className="badge-in pointer-events-none absolute left-3 top-3 flex flex-col items-start gap-1.5">
          {soldOut ? (
            <span className="bg-obsidian/85 px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-porcelain">Sold out</span>
          ) : (
            <>
              {product.isNew && <span className="bg-midnight/95 px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-blush">New</span>}
              {off > 0 && <span className="bg-burgundy px-2 py-1 text-[0.58rem] font-semibold uppercase tracking-[0.16em] text-porcelain">−{off}%</span>}
            </>
          )}
        </div>
        {typeof index === "number" && (
          <span className="pointer-events-none absolute bottom-3 left-3 font-serif text-sm italic text-porcelain mix-blend-difference md:hidden">
            {String(index + 1).padStart(2, "0")}
          </span>
        )}

        <WishlistButton productId={product.id} name={product.name} className="absolute right-2.5 top-2.5 rounded-full bg-midnight/85 backdrop-blur-sm hover:bg-midnight" />
        {!soldOut && <QuickAdd product={toQuickAdd(product)} />}
      </div>

      <div className="mt-4 flex items-start justify-between gap-3 px-3.5">
        <div className="min-w-0">
          <p className="eyebrow truncate text-[0.58rem] text-gold">
            {brand}
            <span className="mx-1.5 text-line-strong" aria-hidden>/</span>
            {product.category.name}
          </p>
          <h3 className="product-name mt-1.5 text-ink">
            <Link href={`/products/${product.slug}`} className="transition-colors duration-300 hover:text-blush">{product.name}</Link>
          </h3>
        </div>
        {swatches.length > 0 && (
          <div className="mt-1 flex shrink-0 items-center gap-1" aria-label={`Colours: ${swatches.map(([n]) => n).join(", ")}`}>
            {swatches.slice(0, 4).map(([name, hex]) => (
              <span key={name} title={name ?? ""} className="size-3 rounded-full border border-porcelain ring-1 ring-line" style={{ backgroundColor: hex }} />
            ))}
            {swatches.length > 4 && <span className="text-[0.6rem] text-ink-mute">+{swatches.length - 4}</span>}
          </div>
        )}
      </div>
      <p className="mt-1.5 flex flex-wrap items-baseline gap-x-2 px-3.5 text-sm">
        <span className="font-semibold text-ink">{formatINR(price)}</span>
        {compareAt && <span className="text-ink-mute line-through">{formatINR(compareAt)}</span>}
        {off > 0 && <span className="text-[0.7rem] font-semibold text-blush">{off}% off</span>}
      </p>
      {stockSizes.length > 1 && (
        <p className="mt-1.5 truncate px-3.5 text-[0.68rem] tracking-[0.08em] text-ink-mute" aria-label={`Sizes in stock: ${stockSizes.join(", ")}`}>
          {stockSizes.join(" · ")}
        </p>
      )}
    </article>
  );
}
