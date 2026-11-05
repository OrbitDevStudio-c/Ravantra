import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-dvh place-items-center bg-ivory px-6 text-center">
      <div>
        <p className="font-serif text-[clamp(6rem,18vw,14rem)] leading-none text-champagne">404</p>
        <h1 className="display -mt-6 text-5xl text-espresso">This page has moved on.</h1>
        <p className="mx-auto mt-4 max-w-sm text-sm text-ink-soft">The page you were looking for doesn&apos;t exist — but plenty of beautiful things do.</p>
        <div className="mt-10 flex justify-center gap-6 text-[0.75rem] uppercase tracking-[0.18em]">
          <Link href="/" className="link-u">Home</Link>
          <Link href="/products" className="link-u">Shop</Link>
          <Link href="/salon-spa" className="link-u">Salon &amp; Spa</Link>
        </div>
      </div>
    </div>
  );
}
