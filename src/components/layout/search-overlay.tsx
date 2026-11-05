"use client";

import * as React from "react";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Search } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { formatINR } from "@/lib/utils";

type Hit = { slug: string; name: string; division: string; price: number; image: string };

const SUGGESTED = ["Silk dress", "Saree", "Face oil", "Pearl", "Handbag", "Perfume"];

export function SearchOverlay({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const router = useRouter();
  const [q, setQ] = React.useState("");
  const [hits, setHits] = React.useState<Hit[]>([]);
  const [loading, setLoading] = React.useState(false);

  React.useEffect(() => {
    const term = q.trim();
    if (term.length < 2) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(term)}`, { signal: ctrl.signal });
        if (res.ok) setHits(((await res.json()) as { hits: Hit[] }).hits);
      } catch {
        /* aborted */
      } finally {
        setLoading(false);
      }
    }, 180);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [q]);

  const submit = (term: string) => {
    if (!term.trim()) return;
    onOpenChange(false);
    router.push(`/products?q=${encodeURIComponent(term.trim())}`);
  };

  const showHits = q.trim().length >= 2;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="top" title="Search RAVANTRA" className="max-h-[88dvh]">
        <div className="container-lux py-10 md:py-14">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submit(q);
            }}
            className="flex items-center gap-4 border-b border-espresso pb-3"
            role="search"
          >
            <Search className="size-5 shrink-0 text-mocha" strokeWidth={1.25} />
            <input
              autoFocus
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search dresses, skincare, jewellery…"
              className="w-full bg-transparent font-serif text-[clamp(1.6rem,3.5vw,2.75rem)] text-espresso placeholder:text-ink-mute/60 focus:outline-none"
              aria-label="Search products"
            />
            {loading && <span className="size-4 shrink-0 animate-spin rounded-full border border-espresso border-r-transparent" />}
          </form>

          {!showHits && (
            <div className="mt-8">
              <p className="eyebrow text-mocha">Popular searches</p>
              <div className="mt-4 flex flex-wrap gap-2">
                {SUGGESTED.map((s) => (
                  <button key={s} onClick={() => submit(s)} className="border border-line-strong px-4 py-2 text-sm transition hover:border-espresso hover:bg-espresso hover:text-ivory">
                    {s}
                  </button>
                ))}
              </div>
            </div>
          )}

          {showHits && (
            <div className="mt-8">
              {hits.length === 0 && !loading ? (
                <p className="text-sm text-ink-soft">No matches for “{q}”. Try a different word.</p>
              ) : (
                <ul className="grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-6">
                  {hits.map((h) => (
                    <li key={h.slug}>
                      <Link href={`/products/${h.slug}`} onClick={() => onOpenChange(false)} className="group block">
                        <div className="img-zoom relative aspect-[3/4] overflow-hidden bg-champagne">
                          <Image src={h.image} alt={h.name} fill sizes="200px" className="object-cover" quality={60} />
                        </div>
                        <p className="eyebrow mt-3 text-[0.6rem] text-mocha">{h.division}</p>
                        <p className="mt-1 line-clamp-1 text-sm">{h.name}</p>
                        <p className="text-sm text-ink-soft">{formatINR(h.price)}</p>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
              {hits.length > 0 && (
                <button onClick={() => submit(q)} className="mt-8 inline-flex items-center gap-2 text-xs uppercase tracking-[0.16em]">
                  <span className="link-u">See all results</span> <ArrowUpRight className="size-3.5" />
                </button>
              )}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
