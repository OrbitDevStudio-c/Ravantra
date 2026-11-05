"use client";

import * as React from "react";
import Image from "@/components/ui/smart-image";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { LazyMotion, domAnimation, m, AnimatePresence } from "motion/react";
import { toast } from "sonner";
import { CalendarPlus, Check, ChevronLeft, Clock, MessageCircle } from "lucide-react";
import type { Service, Stylist } from "@/types";
import { bookAppointment } from "@/features/appointments/actions";
import { useAuthUser } from "@/features/auth/use-auth";
import { label12, utcToIst, type Slot } from "@/features/salon/slots";
import { Button, ArrowRight } from "@/components/ui/button";
import { Field, Input, Textarea } from "@/components/ui/primitives";
import { SlotPicker } from "./slot-picker";
import { cn, formatINR } from "@/lib/utils";

const STEPS = ["Service", "Specialist", "Date", "Time", "Details", "Confirm"];

export function BookingWizard({ services, stylists, whatsapp, preview }: { services: Service[]; stylists: Stylist[]; whatsapp: string; preview: boolean }) {
  const params = useSearchParams();
  const router = useRouter();
  const { user } = useAuthUser();
  const initialService = services.find((s) => s.slug === params.get("service"));
  const initialStylist = stylists.find((s) => s.slug === params.get("stylist"));

  const [serviceId, setServiceId] = React.useState(initialService?.id ?? "");
  const [stylistId, setStylistId] = React.useState(initialStylist && initialService && initialStylist.serviceIds.includes(initialService.id) ? initialStylist.id : "");
  const [when, setWhen] = React.useState<{ date: string; slot: Slot | null }>({ date: "", slot: null });
  const [details, setDetails] = React.useState({ name: "", email: "", phone: "", notes: "" });
  const [errors, setErrors] = React.useState<Record<string, string | undefined>>({});
  const [screen, setScreen] = React.useState(initialService ? (stylistId ? 2 : 1) : 0);
  const [dir, setDir] = React.useState(1);
  const [submitting, setSubmitting] = React.useState(false);
  const [done, setDone] = React.useState<{ reference: string; startsAt: string; endsAt: string } | null>(null);
  const [category, setCategory] = React.useState("All");

  const [prefilledFor, setPrefilledFor] = React.useState<string | null>(null);
  if (user && prefilledFor !== user.id) {
    const meta = user.user_metadata as { full_name?: string; phone?: string };
    setPrefilledFor(user.id);
    setDetails((d) => ({ name: d.name || meta.full_name || "", email: d.email || user.email || "", phone: d.phone || meta.phone || "", notes: d.notes }));
  }

  const service = services.find((s) => s.id === serviceId);
  const stylist = stylists.find((s) => s.id === stylistId);
  const eligibleStylists = stylists.filter((s) => !serviceId || s.serviceIds.includes(serviceId));
  const categories = ["All", ...new Set(services.map((s) => s.category))];

  // screen indices: 0 service, 1 stylist, 2 when (date+time), 3 details, 4 review
  const stepIndex = [0, 1, when.slot ? 3 : 2, 4, 5][screen];
  const go = (n: number) => {
    setDir(n > screen ? 1 : -1);
    setScreen(n);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateDetails = () => {
    const e: Record<string, string | undefined> = {};
    if (details.name.trim().length < 2) e.name = "Enter your full name";
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(details.email)) e.email = "Enter a valid email";
    if (!/^\+?[0-9 ]{10,15}$/.test(details.phone.trim())) e.phone = "Enter a valid phone number";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const confirm = async () => {
    if (!service || !stylist || !when.slot) return;
    setSubmitting(true);
    const res = await bookAppointment({
      serviceId: service.id,
      stylistId: stylist.id,
      startsAt: when.slot.startsAt,
      name: details.name,
      email: details.email,
      phone: details.phone,
      notes: details.notes,
    });
    setSubmitting(false);
    if (res.ok) {
      setDone({ reference: res.data.reference, startsAt: res.data.startsAt, endsAt: res.data.endsAt });
      router.replace("/salon-spa/book?booked=1", { scroll: true });
    } else {
      toast.error(res.error);
      if (res.error.includes("just booked")) go(2);
    }
  };

  if (done && service && stylist) {
    return <Confirmation done={done} service={service} stylist={stylist} whatsapp={whatsapp} signedIn={Boolean(user)} />;
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <div className="grid gap-12 lg:grid-cols-12">
        {/* Progress + summary */}
        <aside className="lg:col-span-4">
          <div className="lg:sticky lg:top-24">
            <ol className="grid grid-cols-6 gap-1 lg:grid-cols-1 lg:gap-0">
              {STEPS.map((label, i) => (
                <li key={label} className={cn("relative lg:flex lg:items-center lg:gap-4 lg:py-3", i < STEPS.length - 1 && "lg:border-l-0")}>
                  <span className={cn("block h-0.5 lg:hidden", i <= stepIndex ? "bg-espresso" : "bg-line")} />
                  <span
                    className={cn(
                      "hidden size-8 shrink-0 place-items-center rounded-full border font-serif text-sm transition lg:grid",
                      i < stepIndex ? "border-espresso bg-espresso text-ivory" : i === stepIndex ? "border-espresso" : "border-line text-ink-mute",
                    )}
                  >
                    {i < stepIndex ? <Check className="size-3.5" /> : i + 1}
                  </span>
                  <span className={cn("mt-2 block text-[0.6rem] uppercase tracking-[0.14em] lg:mt-0 lg:text-[0.72rem]", i <= stepIndex ? "text-espresso" : "text-ink-mute")}>
                    {label}
                  </span>
                </li>
              ))}
            </ol>

            <div className="mt-8 hidden border border-line bg-white/50 p-6 lg:block">
              <p className="eyebrow text-mocha">Your booking</p>
              <dl className="mt-4 space-y-3 text-sm">
                <SummaryRow label="Service" value={service ? `${service.name}` : "—"} />
                <SummaryRow label="Duration" value={service ? `${service.durationMin} min` : "—"} />
                <SummaryRow label="Specialist" value={stylist?.name ?? "—"} />
                <SummaryRow label="When" value={when.slot ? `${formatDay(when.date)}, ${when.slot.label}` : "—"} />
              </dl>
              <div className="mt-5 flex items-baseline justify-between border-t border-line pt-4">
                <span className="eyebrow">Total</span>
                <span className="font-serif text-2xl">{service ? formatINR(service.price) : "—"}</span>
              </div>
              <p className="mt-2 text-[0.7rem] text-ink-mute">Pay at the salon. Free cancellation up to 4 hours before.</p>
            </div>
          </div>
        </aside>

        <div className="relative min-h-[520px] lg:col-span-8">
          {screen > 0 && (
            <button onClick={() => go(screen - 1)} className="mb-6 inline-flex items-center gap-1 text-xs uppercase tracking-[0.16em] text-ink-soft hover:text-espresso">
              <ChevronLeft className="size-3.5" /> Back
            </button>
          )}
          <AnimatePresence mode="wait" custom={dir} initial={false}>
            <m.div
              key={screen}
              custom={dir}
              initial={{ opacity: 0, x: dir * 28 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: dir * -28 }}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            >
              {screen === 0 && (
                <section>
                  <StepHeading n={1} title="Choose a service" />
                  <div className="no-scrollbar mt-6 flex gap-2 overflow-x-auto">
                    {categories.map((c) => (
                      <button key={c} onClick={() => setCategory(c)} className={cn("shrink-0 border px-4 py-2 text-[0.68rem] uppercase tracking-[0.16em] transition", category === c ? "border-espresso bg-espresso text-ivory" : "border-line-strong hover:border-espresso")}>
                        {c}
                      </button>
                    ))}
                  </div>
                  <ul className="mt-6 grid gap-3 sm:grid-cols-2">
                    {services.filter((s) => category === "All" || s.category === category).map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            setServiceId(s.id);
                            if (stylistId && !stylists.find((x) => x.id === stylistId)?.serviceIds.includes(s.id)) setStylistId("");
                            setWhen({ date: "", slot: null });
                            go(1);
                          }}
                          className={cn("group flex w-full gap-4 border p-3 text-left transition", serviceId === s.id ? "border-espresso bg-white" : "border-line hover:border-line-strong hover:bg-white/60")}
                        >
                          <span className="relative aspect-square w-20 shrink-0 overflow-hidden bg-champagne">
                            <Image src={s.image} alt="" fill sizes="80px" quality={50} className="object-cover" />
                          </span>
                          <span className="min-w-0 flex-1 py-1">
                            <span className="eyebrow block text-[0.58rem] text-mocha">{s.category}</span>
                            <span className="mt-1 block font-serif text-xl leading-tight">{s.name}</span>
                            <span className="mt-2 flex items-center gap-3 text-xs text-ink-soft">
                              <span className="inline-flex items-center gap-1"><Clock className="size-3" /> {s.durationMin} min</span>
                              <span>{formatINR(s.price)}</span>
                            </span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {screen === 1 && service && (
                <section>
                  <StepHeading n={2} title="Choose your specialist" sub={`Specialists offering ${service.name}`} />
                  <ul className="mt-8 grid gap-4 sm:grid-cols-2">
                    {eligibleStylists.map((s) => (
                      <li key={s.id}>
                        <button
                          onClick={() => {
                            setStylistId(s.id);
                            setWhen({ date: "", slot: null });
                            go(2);
                          }}
                          className={cn("group flex w-full gap-5 border p-4 text-left transition", stylistId === s.id ? "border-espresso bg-white" : "border-line hover:border-line-strong hover:bg-white/60")}
                        >
                          <span className="relative aspect-[4/5] w-24 shrink-0 overflow-hidden bg-champagne">
                            <Image src={s.image} alt={s.name} fill sizes="96px" quality={55} className="object-cover object-top grayscale-[30%] transition group-hover:grayscale-0" />
                          </span>
                          <span className="py-1">
                            <span className="block font-serif text-2xl leading-tight">{s.name}</span>
                            <span className="mt-1 block text-xs text-mocha">{s.title}</span>
                            <span className="mt-3 block text-xs text-ink-soft">{s.experienceYears} years · {s.specialties.join(", ")}</span>
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              {screen === 2 && service && stylist && (
                <section>
                  <StepHeading n={3} title="Pick a date & time" sub={`${stylist.name} · ${service.durationMin} minutes`} />
                  <div className="mt-8">
                    <SlotPicker serviceId={service.id} stylistId={stylist.id} workingHours={stylist.workingHours} value={when} onChange={setWhen} />
                  </div>
                  <div className="mt-10 flex justify-end">
                    <Button size="lg" disabled={!when.slot} onClick={() => go(3)}>Continue <ArrowRight /></Button>
                  </div>
                </section>
              )}

              {screen === 3 && (
                <section>
                  <StepHeading n={5} title="Your details" sub={user ? "We've filled in what we know." : "Have an account? Sign in to track this booking."} />
                  {!user && (
                    <Link href="/login?next=/salon-spa/book" className="mt-3 inline-block text-xs underline underline-offset-4">Sign in</Link>
                  )}
                  <form
                    className="mt-8 grid gap-6 sm:grid-cols-2"
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (validateDetails()) go(4);
                    }}
                    noValidate
                  >
                    <Field label="Full name" error={errors.name} htmlFor="b-name"><Input id="b-name" autoComplete="name" value={details.name} onChange={(e) => setDetails({ ...details, name: e.target.value })} /></Field>
                    <Field label="Phone" error={errors.phone} htmlFor="b-phone"><Input id="b-phone" inputMode="tel" autoComplete="tel" value={details.phone} onChange={(e) => setDetails({ ...details, phone: e.target.value })} placeholder="+91 98xxx xxxxx" /></Field>
                    <Field label="Email" error={errors.email} className="sm:col-span-2" htmlFor="b-email"><Input id="b-email" type="email" autoComplete="email" value={details.email} onChange={(e) => setDetails({ ...details, email: e.target.value })} /></Field>
                    <Field label="Notes for your specialist (optional)" className="sm:col-span-2" htmlFor="b-notes">
                      <Textarea id="b-notes" value={details.notes} onChange={(e) => setDetails({ ...details, notes: e.target.value.slice(0, 500) })} placeholder="Hair length, skin concerns, occasion…" />
                    </Field>
                    <div className="flex justify-end sm:col-span-2">
                      <Button size="lg" type="submit">Review booking <ArrowRight /></Button>
                    </div>
                  </form>
                </section>
              )}

              {screen === 4 && service && stylist && when.slot && (
                <section>
                  <StepHeading n={6} title="Confirm your appointment" />
                  <div className="mt-8 grid gap-8 border border-line bg-white/50 p-6 sm:grid-cols-[160px_1fr] md:p-8">
                    <div className="relative aspect-[4/5] overflow-hidden bg-champagne">
                      <Image src={service.image} alt="" fill sizes="160px" quality={55} className="object-cover" />
                    </div>
                    <dl className="grid gap-4 text-sm sm:grid-cols-2">
                      <Detail label="Service" value={service.name} />
                      <Detail label="Specialist" value={stylist.name} />
                      <Detail label="Date" value={formatDay(when.date, true)} />
                      <Detail label="Time" value={`${when.slot.label} – ${label12(utcToIst(new Date(new Date(when.slot.startsAt).getTime() + service.durationMin * 60000)).time)} IST`} />
                      <Detail label="Guest" value={`${details.name} · ${details.phone}`} />
                      <Detail label="Price" value={`${formatINR(service.price)} · pay at salon`} />
                    </dl>
                  </div>
                  {preview && <p className="mt-4 text-sm text-warning">Preview mode — connect Supabase to save bookings.</p>}
                  <div className="mt-8 flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
                    <p className="text-xs text-ink-mute">By confirming you agree to our 4-hour cancellation policy.</p>
                    <Button size="lg" loading={submitting} onClick={confirm}>Confirm appointment</Button>
                  </div>
                </section>
              )}
            </m.div>
          </AnimatePresence>
        </div>
      </div>
    </LazyMotion>
  );
}

function formatDay(date: string, long = false) {
  const [y, m, d] = date.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-IN", { weekday: long ? "long" : "short", day: "numeric", month: long ? "long" : "short", timeZone: "UTC" });
}

function StepHeading({ n, title, sub }: { n: number; title: string; sub?: string }) {
  return (
    <div>
      <p className="font-serif text-sm italic text-gold-deep">Step {n} of 6</p>
      <h2 className="display mt-2 text-[clamp(2rem,3.4vw,3rem)]">{title}</h2>
      {sub && <p className="mt-2 text-sm text-ink-soft">{sub}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <dt className="text-ink-mute">{label}</dt>
      <dd className="text-right">{value}</dd>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="eyebrow text-[0.6rem] text-ink-mute">{label}</dt>
      <dd className="mt-1 font-serif text-lg leading-snug">{value}</dd>
    </div>
  );
}

function Confirmation({
  done,
  service,
  stylist,
  whatsapp,
  signedIn,
}: {
  done: { reference: string; startsAt: string; endsAt: string };
  service: Service;
  stylist: Stylist;
  whatsapp: string;
  signedIn: boolean;
}) {
  const start = utcToIst(done.startsAt);
  const when = `${formatDay(start.date, true)} at ${label12(start.time)} IST`;
  const ics = React.useMemo(() => {
    const fmt = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
    const body = [
      "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//RAVANTRA//Salon//EN", "BEGIN:VEVENT",
      `UID:${done.reference}@ravantra`, `DTSTAMP:${fmt(new Date().toISOString())}`, `DTSTART:${fmt(done.startsAt)}`, `DTEND:${fmt(done.endsAt)}`,
      `SUMMARY:${service.name} with ${stylist.name} — RAVANTRA`, "LOCATION:RAVANTRA Salon & Spa, 14 Linking Road, Bandra West, Mumbai",
      `DESCRIPTION:Booking reference ${done.reference}`, "END:VEVENT", "END:VCALENDAR",
    ].join("\r\n");
    return `data:text/calendar;charset=utf-8,${encodeURIComponent(body)}`;
  }, [done, service.name, stylist.name]);
  const wa = `https://wa.me/${whatsapp}?text=${encodeURIComponent(`Hi RAVANTRA, I've requested ${service.name} with ${stylist.name} on ${when}. Reference: ${done.reference}`)}`;

  return (
    <div className="mx-auto max-w-2xl py-6 text-center animate-fade-up">
      <span className="mx-auto grid size-16 place-items-center rounded-full bg-sage/15 text-sage"><Check className="size-7" strokeWidth={1.25} /></span>
      <p className="eyebrow mt-8 text-mocha">Reference {done.reference}</p>
      <h2 className="display mt-4 text-[clamp(2.4rem,4.5vw,3.8rem)]">You&apos;re booked in.</h2>
      <p className="mx-auto mt-5 max-w-md text-ink-soft">
        {service.name} with {stylist.name} on <strong className="font-medium text-espresso">{when}</strong>. Your request is pending confirmation — we&apos;ll email you shortly.
      </p>
      <div className="mt-10 flex flex-wrap justify-center gap-3">
        <Button variant="outline" asChild>
          <a href={ics} download={`ravantra-${done.reference}.ics`}><CalendarPlus /> Add to calendar</a>
        </Button>
        <Button variant="outline" asChild>
          <a href={wa} target="_blank" rel="noopener noreferrer"><MessageCircle /> Share on WhatsApp</a>
        </Button>
        {signedIn ? (
          <Button asChild><Link href="/account/appointments">Manage booking</Link></Button>
        ) : (
          <Button asChild><Link href="/register">Create an account</Link></Button>
        )}
      </div>
    </div>
  );
}
