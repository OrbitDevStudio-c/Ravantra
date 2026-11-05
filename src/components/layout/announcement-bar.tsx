const MESSAGES = [
  "Complimentary shipping above ₹2,999",
  "Book salon & spa appointments online",
  "One account across fashion, beauty & lifestyle",
  "Gift wrapping on every order",
  "Demo storefront — no real payments are taken without Razorpay keys",
];

/** CSS-only marquee (no JS). Duplicated track for a seamless loop. */
export function AnnouncementBar() {
  const track = (
    <ul className="flex shrink-0 items-center gap-12 pr-12">
      {MESSAGES.map((m) => (
        <li key={m} className="flex items-center gap-12 whitespace-nowrap">
          <span>{m}</span>
          <span className="text-gold" aria-hidden>✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className="relative z-[51] overflow-hidden bg-espresso py-2 text-[0.68rem] uppercase tracking-[0.2em] text-ivory/85">
      <div className="flex w-max animate-marquee hover:[animation-play-state:paused]" aria-label="Store announcements">
        {track}
        <div aria-hidden className="flex">{track}</div>
      </div>
    </div>
  );
}
