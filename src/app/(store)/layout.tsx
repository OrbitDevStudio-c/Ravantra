import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteHeader, type NavDivision } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { StoreProviders } from "@/components/providers";
import { PreviewBanner } from "@/components/layout/preview-banner";
import { getCategories, getDivisions } from "@/features/catalog/queries";
import { getServices } from "@/features/salon/queries";
import { isPreviewMode } from "@/lib/env";

export default async function StoreLayout({ children }: LayoutProps<"/">) {
  const [divisions, categories, services] = await Promise.all([getDivisions(), getCategories(), getServices()]);
  const serviceCategories = [...new Set(services.map((s) => s.category))];

  const nav: NavDivision[] = divisions.map((d) => {
    const isSalon = d.kind === "services";
    const href = isSalon ? "/salon-spa" : `/${d.slug}`;
    return {
      id: d.id,
      slug: d.slug,
      label: d.shortName,
      tagline: d.tagline,
      image: d.bannerImage || d.heroImage,
      href,
      links: isSalon
        ? [
            ...serviceCategories.map((c) => ({ label: c, href: `/salon-spa?category=${encodeURIComponent(c)}#services` })),
            { label: "Our experts", href: "/salon-spa#experts" },
          ]
        : [
            { label: "Shop all", href },
            ...categories.filter((c) => c.divisionId === d.id).map((c) => ({ label: c.name, href: `${href}?category=${c.slug}` })),
            { label: "New in", href: `${href}?sort=newest` },
          ],
      cta: isSalon ? { label: "Book an appointment", href: "/salon-spa/book" } : { label: `Shop ${d.shortName}`, href },
    };
  });

  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:bg-espresso focus:px-4 focus:py-2 focus:text-ivory">
        Skip to content
      </a>
      {isPreviewMode && <PreviewBanner />}
      <AnnouncementBar />
      <SiteHeader divisions={nav} />
      <main id="main" className="min-h-[60vh]">{children}</main>
      <SiteFooter divisions={divisions} />
      <StoreProviders />
    </>
  );
}
