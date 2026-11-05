"use client";

import * as React from "react";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { Heart } from "lucide-react";
import { useWishlist, wishlist } from "@/features/wishlist/store";
import { getWishlistProducts } from "@/features/account/actions";
import { QuickAdd, type QuickAddProduct } from "@/components/products/quick-add";
import { EmptyState, Skeleton } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { formatINR } from "@/lib/utils";

type Item = QuickAddProduct & { price: number; compareAt: number | null; category: string };

export function WishlistView() {
  const ids = useWishlist();
  const [items, setItems] = React.useState<Item[] | null>(null);
  const key = ids.join(",");

  React.useEffect(() => {
    let alive = true;
    getWishlistProducts(key ? key.split(",") : []).then((r) => alive && setItems(r));
    return () => {
      alive = false;
    };
  }, [key]);

  if (items === null) return <div className="grid grid-cols-2 gap-6 md:grid-cols-3">{[0, 1, 2].map((i) => <Skeleton key={i} className="aspect-[3/4]" />)}</div>;
  const visible = items.filter((i) => ids.includes(i.productId));
  if (!visible.length) {
    return <EmptyState icon={<Heart className="size-9" strokeWidth={1} />} title="Your wishlist is empty" description="Tap the heart on anything you love to save it here — it follows you across devices once you're signed in." action={<Button asChild><Link href="/products">Discover pieces</Link></Button>} />;
  }
  return (
    <div>
      <h2 className="font-serif text-3xl">Saved pieces <span className="text-ink-mute">({visible.length})</span></h2>
      <ul className="mt-8 grid grid-cols-2 gap-x-4 gap-y-10 md:grid-cols-3">
        {visible.map((p) => (
          <li key={p.productId} className="group">
            <div className="relative aspect-[3/4] overflow-hidden bg-champagne">
              <Link href={`/products/${p.slug}`} className="img-zoom absolute inset-0">
                <Image src={p.image} alt={p.name} fill sizes="(min-width:768px) 25vw, 48vw" quality={60} className="object-cover" />
              </Link>
              <button onClick={() => wishlist.toggle(p.productId)} className="absolute right-2 top-2 grid size-9 place-items-center bg-ivory/90 text-xs" aria-label={`Remove ${p.name}`}>✕</button>
              <QuickAdd product={p} />
            </div>
            <p className="eyebrow mt-3 text-[0.6rem] text-mocha">{p.division} / {p.category}</p>
            <Link href={`/products/${p.slug}`} className="mt-1 block text-sm hover:underline">{p.name}</Link>
            <p className="text-sm">{formatINR(Math.min(...p.variants.map((v) => v.price)))}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}
