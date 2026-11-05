import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { BRAND } from "@/config/site";
import { WHATSAPP_NUMBER } from "@/lib/env";
import { ContactForm } from "@/components/home/contact-form";
import { Eyebrow } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Contact",
  description: "Get in touch with RAVANTRA client care — orders, salon bookings, product questions and partnerships.",
  alternates: { canonical: "/contact" },
};

const FAQ = [
  ["How much is shipping?", "Shipping is complimentary on orders above ₹2,999. Below that, a flat ₹149 applies anywhere in India. Orders dispatch within 24–48 hours."],
  ["What is your returns policy?", "Unworn, unwashed fashion and lifestyle pieces with tags can be returned within 7 days of delivery. Beauty products must be unopened and sealed."],
  ["How do I cancel or reschedule a salon appointment?", "From My account → Appointments, up to 4 hours before your appointment. After that, please call the salon."],
  ["Which payment methods do you accept?", "UPI, credit and debit cards, netbanking and popular wallets through Razorpay. All payments are verified on our servers."],
  ["Can I use one account across divisions?", "Yes — one RAVANTRA account covers fashion, beauty, lifestyle orders and salon bookings, with a single wishlist and order history."],
];

export default function ContactPage() {
  return (
    <div className="container-lux pb-24 pt-14">
      <div className="grid gap-16 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <Eyebrow>Client care</Eyebrow>
          <h1 className="display mt-5 text-[clamp(3rem,6vw,5.6rem)]">We&apos;d love to <em className="italic text-mocha">hear from you.</em></h1>
          <dl className="mt-12 space-y-7 text-sm">
            <div><dt className="eyebrow text-[0.62rem] text-ink-mute">Visit</dt><dd className="mt-2 font-serif text-xl leading-snug">{BRAND.contact.address}</dd></div>
            <div><dt className="eyebrow text-[0.62rem] text-ink-mute">Hours</dt><dd className="mt-2">{BRAND.contact.hours}</dd></div>
            <div><dt className="eyebrow text-[0.62rem] text-ink-mute">Email</dt><dd className="mt-2"><a href={`mailto:${BRAND.contact.email}`} className="link-u">{BRAND.contact.email}</a></dd></div>
            <div><dt className="eyebrow text-[0.62rem] text-ink-mute">Phone</dt><dd className="mt-2">{BRAND.contact.phone}</dd></div>
          </dl>
          <a
            href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hi RAVANTRA, I have a question.")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-10 inline-flex items-center gap-3 border border-espresso px-5 py-3 text-[0.72rem] uppercase tracking-[0.18em] transition hover:bg-espresso hover:text-ivory"
          >
            <MessageCircle className="size-4" strokeWidth={1.25} /> Chat on WhatsApp
          </a>
        </div>
        <div className="lg:col-span-6 lg:col-start-7">
          <div className="border border-line bg-white/50 p-6 md:p-10">
            <h2 className="font-serif text-3xl">Send a message</h2>
            <div className="mt-8"><ContactForm /></div>
          </div>
        </div>
      </div>

      <section id="faq" className="mt-28 grid scroll-mt-24 gap-12 lg:grid-cols-12">
        <div className="lg:col-span-4">
          <Eyebrow>Help</Eyebrow>
          <h2 className="display mt-4 text-5xl">Questions, answered</h2>
        </div>
        <div className="divide-y divide-line border-y border-line lg:col-span-8">
          {FAQ.map(([q, a]) => (
            <details key={q} className="group py-6">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-6 font-serif text-2xl">
                {q}
                <span className="shrink-0 text-xl text-ink-mute transition-transform group-open:rotate-45">+</span>
              </summary>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-ink-soft">{a}</p>
            </details>
          ))}
        </div>
      </section>
    </div>
  );
}
