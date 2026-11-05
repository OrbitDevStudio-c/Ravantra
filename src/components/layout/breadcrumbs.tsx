import Link from "next/link";
import { cn, absoluteUrl } from "@/lib/utils";

export function Breadcrumbs({ items, tone = "dark", className }: { items: { label: string; href?: string }[]; tone?: "dark" | "light"; className?: string }) {
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((it, i) => ({ "@type": "ListItem", position: i + 1, name: it.label, item: it.href ? absoluteUrl(it.href) : undefined })),
  };
  return (
    <nav aria-label="Breadcrumb" className={cn("text-[0.7rem] uppercase tracking-[0.16em]", tone === "light" ? "text-ivory/60" : "text-ink-mute", className)}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <ol className="flex flex-wrap items-center gap-2">
        {items.map((it, i) => (
          <li key={i} className="flex items-center gap-2">
            {i > 0 && <span aria-hidden>/</span>}
            {it.href && i < items.length - 1 ? (
              <Link href={it.href} className={cn("transition", tone === "light" ? "hover:text-ivory" : "hover:text-espresso")}>{it.label}</Link>
            ) : (
              <span aria-current={i === items.length - 1 ? "page" : undefined} className={tone === "light" ? "text-ivory/90" : "text-espresso"}>{it.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
