"use client";

import * as React from "react";
import Link from "next/link";
import Image from "@/components/ui/smart-image";
import { usePathname } from "next/navigation";
import { Heart, Menu, Search, ShoppingBag, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { cartDrawer, useCart } from "@/features/cart/store";
import { useWishlist } from "@/features/wishlist/store";
import { useAuthUser } from "@/features/auth/use-auth";
import { Sheet, SheetContent, SheetTrigger, SheetClose } from "@/components/ui/sheet";
import { SearchOverlay } from "./search-overlay";
import { Logo } from "@/components/ui/logo";

export interface NavDivision {
  id: string;
  slug: string;
  label: string;
  tagline: string;
  image: string;
  href: string;
  links: { label: string; href: string }[];
  cta: { label: string; href: string };
}

export function SiteHeader({ divisions }: { divisions: NavDivision[] }) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = React.useState(false);
  const [open, setOpen] = React.useState<string | null>(null);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const closeTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const { count } = useCart();
  const saved = useWishlist();
  const { user } = useAuthUser();

  React.useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" && (e.metaKey || e.ctrlKey)) || (e.key === "/" && !(e.target as HTMLElement)?.closest("input,textarea"))) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // close mega menu on route change
  const [lastPath, setLastPath] = React.useState(pathname);
  if (lastPath !== pathname) {
    setLastPath(pathname);
    setOpen(null);
  }

  const enter = (slug: string) => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    setOpen(slug);
  };
  const leave = () => {
    closeTimer.current = setTimeout(() => setOpen(null), 140);
  };

  const active = divisions.find((d) => d.slug === open);

  return (
    <>
      <header
        className={cn(
          "sticky top-0 z-50 transition-[background-color,box-shadow,backdrop-filter] duration-500",
          scrolled || open ? "bg-ivory/92 shadow-[0_1px_0_var(--color-line)] backdrop-blur-md" : "bg-ivory",
        )}
        onMouseLeave={leave}
      >
        <div className={cn("container-lux grid grid-cols-[1fr_auto_1fr] items-center transition-[height] duration-500", scrolled ? "h-16" : "h-[76px]")}>
          {/* Left: mobile menu / desktop division nav */}
          <div className="flex items-center gap-1">
            <Sheet>
              <SheetTrigger asChild>
                <button className="-ml-2 grid size-10 place-items-center xl:hidden" aria-label="Open menu">
                  <Menu className="size-5" strokeWidth={1.25} />
                </button>
              </SheetTrigger>
              <MobileMenu divisions={divisions} signedIn={Boolean(user)} />
            </Sheet>
            <nav aria-label="Divisions" className="hidden items-center gap-6 xl:flex 2xl:gap-8">
              {divisions.map((d) => (
                <div key={d.slug} onMouseEnter={() => enter(d.slug)} onFocus={() => enter(d.slug)}>
                  <Link
                    href={d.href}
                    className={cn(
                      "link-u whitespace-nowrap py-2 text-[0.76rem] font-medium uppercase tracking-[0.14em] text-espresso",
                      pathname.startsWith(d.href) && "!bg-[length:100%_1px]",
                    )}
                    aria-expanded={open === d.slug}
                    aria-current={pathname.startsWith(d.href) ? "page" : undefined}
                  >
                    {d.label}
                  </Link>
                </div>
              ))}
            </nav>
          </div>

          {/* Center: wordmark */}
          <Link href="/" className="flex items-center justify-center px-3" aria-label="RAVANTRA home">
            <Logo variant="lockup" priority height={scrolled ? 40 : 48} className="transition-[font-size] duration-500 max-sm:!text-[38px]" />
          </Link>

          {/* Right: utility */}
          <div className="flex items-center justify-end gap-0.5 md:gap-1.5">
            <nav aria-label="Company" className="mr-3 hidden items-center gap-5 xl:flex">
              <Link href="/about" className="link-u text-[0.78rem] uppercase tracking-[0.14em]">About</Link>
              <Link href="/contact" className="link-u text-[0.78rem] uppercase tracking-[0.14em]">Contact</Link>
            </nav>
            <IconButton label="Search (press /)" onClick={() => setSearchOpen(true)}>
              <Search className="size-[18px]" strokeWidth={1.25} />
            </IconButton>
            <IconLink href={user ? "/account" : "/login"} label={user ? "Your account" : "Sign in"} className="hidden sm:grid">
              <User className="size-[18px]" strokeWidth={1.25} />
              {user && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-gold" />}
            </IconLink>
            <IconLink href="/account/wishlist" label={`Wishlist (${saved.length})`} className="hidden sm:grid">
              <Heart className="size-[18px]" strokeWidth={1.25} />
              {saved.length > 0 && <Counter n={saved.length} />}
            </IconLink>
            <IconButton label={`Shopping bag (${count} items)`} onClick={() => cartDrawer.open()}>
              <ShoppingBag className="size-[18px]" strokeWidth={1.25} />
              {count > 0 && <Counter n={count} dark />}
            </IconButton>
          </div>
        </div>

        {/* Mega menu */}
        <div
          className={cn(
            "absolute inset-x-0 top-full hidden overflow-hidden border-t border-line bg-ivory transition-[opacity,transform,visibility] duration-500 ease-[var(--ease-lux)] xl:block",
            active ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
          )}
          onMouseEnter={() => active && enter(active.slug)}
          onMouseLeave={leave}
        >
          {active && (
            <div className="container-lux grid grid-cols-12 gap-10 py-10">
              <div className="col-span-3">
                <p className="eyebrow text-mocha">{active.label}</p>
                <p className="mt-4 font-serif text-3xl leading-tight text-espresso">{active.tagline}</p>
                <Link href={active.cta.href} className="group mt-6 inline-flex items-center gap-3 text-xs uppercase tracking-[0.16em]">
                  <span className="link-u">{active.cta.label}</span>
                  <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                </Link>
              </div>
              <ul className="col-span-4 columns-2 gap-8">
                {active.links.map((l) => (
                  <li key={l.href} className="mb-3 break-inside-avoid">
                    <Link href={l.href} className="link-u text-[0.95rem] text-ink-soft hover:text-espresso">{l.label}</Link>
                  </li>
                ))}
              </ul>
              <Link href={active.href} className="group img-zoom relative col-span-5 block aspect-[16/8] overflow-hidden bg-champagne">
                <Image src={active.image} alt="" fill sizes="40vw" className="object-cover" quality={60} />
                <span className="absolute bottom-4 left-4 bg-ivory/90 px-3 py-1.5 text-[0.65rem] uppercase tracking-[0.18em] text-espresso">
                  Explore {active.label}
                </span>
              </Link>
            </div>
          )}
        </div>
      </header>
      <SearchOverlay open={searchOpen} onOpenChange={setSearchOpen} />
    </>
  );
}

function Counter({ n, dark }: { n: number; dark?: boolean }) {
  return (
    <span
      className={cn(
        "absolute right-0.5 top-0.5 grid min-w-[17px] place-items-center rounded-full px-1 text-[0.6rem] font-semibold leading-[17px]",
        dark ? "bg-espresso text-ivory" : "bg-gold text-espresso",
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

function IconButton({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className="relative grid size-10 place-items-center text-espresso transition-opacity hover:opacity-70">
      {children}
    </button>
  );
}

function IconLink({ href, label, children, className }: { href: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className={cn("relative grid size-10 place-items-center text-espresso transition-opacity hover:opacity-70", className)}>
      {children}
    </Link>
  );
}

function MobileMenu({ divisions, signedIn }: { divisions: NavDivision[]; signedIn: boolean }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  return (
    <SheetContent side="left" title="Menu" className="max-w-[min(92vw,380px)]">
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-16">
        <p className="eyebrow text-mocha">Shop by division</p>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {divisions.map((d, i) => (
            <li key={d.slug}>
              <div className="flex items-center justify-between py-4">
                <SheetClose asChild>
                  <Link href={d.href} className="flex items-baseline gap-3 font-serif text-[1.65rem] text-espresso">
                    <span className="font-sans text-[0.65rem] text-gold-deep">0{i + 1}</span>
                    {d.label}
                  </Link>
                </SheetClose>
                <button
                  className="grid size-9 place-items-center text-lg text-ink-soft"
                  onClick={() => setExpanded(expanded === d.slug ? null : d.slug)}
                  aria-expanded={expanded === d.slug}
                  aria-label={`Show ${d.label} categories`}
                >
                  <span className={cn("transition-transform duration-300", expanded === d.slug && "rotate-45")}>+</span>
                </button>
              </div>
              <div className={cn("grid transition-[grid-template-rows] duration-500 ease-[var(--ease-lux)]", expanded === d.slug ? "grid-rows-[1fr]" : "grid-rows-[0fr]")}>
                <ul className="overflow-hidden">
                  {d.links.map((l) => (
                    <li key={l.href}>
                      <SheetClose asChild>
                        <Link href={l.href} className="block py-2 pl-7 text-sm text-ink-soft">{l.label}</Link>
                      </SheetClose>
                    </li>
                  ))}
                  <li className="pb-4" />
                </ul>
              </div>
            </li>
          ))}
        </ul>
        <ul className="mt-8 space-y-4 text-sm uppercase tracking-[0.14em]">
          {[
            ["/products", "All products"],
            ["/salon-spa/book", "Book an appointment"],
            ["/about", "About"],
            ["/contact", "Contact"],
            [signedIn ? "/account" : "/login", signedIn ? "My account" : "Sign in / Register"],
            ["/account/wishlist", "Wishlist"],
          ].map(([href, label]) => (
            <li key={href}>
              <SheetClose asChild>
                <Link href={href}>{label}</Link>
              </SheetClose>
            </li>
          ))}
        </ul>
        <div className="mt-auto pt-10">
          <Logo variant="full" height={110} />
          <p className="mt-3 font-serif text-lg italic text-mocha">Everything that makes you, you.</p>
        </div>
      </div>
    </SheetContent>
  );
}
