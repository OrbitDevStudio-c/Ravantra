import type { Metadata } from "next";
import { Suspense } from "react";
import { BookingWizard } from "@/components/booking/booking-wizard";
import { getServices, getStylists } from "@/features/salon/queries";
import { isPreviewMode, WHATSAPP_NUMBER } from "@/lib/env";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export const metadata: Metadata = {
  title: "Book an appointment",
  description: "Book hair, skin, bridal, spa and nail appointments at RAVANTRA Salon & Spa with live availability.",
  alternates: { canonical: "/salon-spa/book" },
};

export default async function BookPage() {
  const [services, stylists] = await Promise.all([getServices(), getStylists()]);
  return (
    <div className="container-lux pb-24 pt-8">
      <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Salon & Spa", href: "/salon-spa" }, { label: "Book" }]} />
      <header className="mb-12 mt-8 border-b border-line pb-8">
        <p className="eyebrow text-sage">Salon &amp; Spa · Live availability</p>
        <h1 className="display mt-3 text-[clamp(2.6rem,5vw,4.6rem)]">Book an appointment</h1>
      </header>
      <Suspense fallback={<div className="skeleton h-[520px]" />}>
        <BookingWizard services={services} stylists={stylists} whatsapp={WHATSAPP_NUMBER} preview={isPreviewMode} />
      </Suspense>
    </div>
  );
}
