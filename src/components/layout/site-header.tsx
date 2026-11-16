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
  eyebrow?: string;
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
          scrolled || open ? "bg-midnight/85 shadow-[0_18px_40px_-28px_rgb(0_0_0/0.9)] backdrop-blur-xl backdrop-saturate-150" : "bg-midnight",
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
            <nav aria-label="Divisions" className="hidden items-center gap-7 xl:flex 2xl:gap-9">
              {divisions.map((d) => (
                <div key={d.slug} onMouseEnter={() => enter(d.slug)} onFocus={() => enter(d.slug)}>
                  <Link
                    href={d.href}
                    className={cn(
                      "nav-indicator whitespace-nowrap py-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] transition-colors duration-300",
                      pathname.startsWith(d.href) || open === d.slug ? "text-white" : "text-ink-soft hover:text-white",
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
            <nav aria-label="Company" className="mr-4 hidden items-center gap-6 2xl:flex">
              <Link href="/divisions" aria-current={pathname === "/divisions" ? "page" : undefined} className="nav-indicator whitespace-nowrap py-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-ink-soft transition-colors duration-300 hover:text-white aria-[current=page]:text-white">Our houses</Link>
              <Link href="/about" aria-current={pathname === "/about" ? "page" : undefined} className="nav-indicator py-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-ink-soft transition-colors duration-300 hover:text-white aria-[current=page]:text-white">About</Link>
              <Link href="/contact" aria-current={pathname === "/contact" ? "page" : undefined} className="nav-indicator py-2 text-[0.72rem] font-medium uppercase tracking-[0.16em] text-ink-soft transition-colors duration-300 hover:text-white aria-[current=page]:text-white">Contact</Link>
            </nav>
            {/* Desktop: search field affordance; smaller screens: icon */}
            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="group/search mr-2 hidden h-10 w-48 items-center gap-2.5 border border-line bg-white/[0.035] pl-3.5 pr-2 text-left text-[0.8rem] text-ink-mute transition-[border-color,background-color,color] duration-300 hover:border-line-strong hover:bg-white/[0.06] hover:text-white lg:flex"
              aria-label="Search the store (press /)"
            >
              <Search className="size-4 shrink-0" strokeWidth={1.25} />
              <span className="flex-1">Search</span>
              <kbd className="rounded-[2px] border border-line-strong px-1.5 font-sans text-[0.62rem] leading-[1.15rem] text-ink-mute transition-colors group-hover/search:border-gold/60 group-hover/search:text-gold">/</kbd>
            </button>
            <IconButton label="Search (press /)" onClick={() => setSearchOpen(true)} className="lg:hidden">
              <Search className="size-[18px]" strokeWidth={1.25} />
            </IconButton>
            <IconLink href={user ? "/account" : "/login"} label={user ? "Your account" : "Sign in"} className="hidden sm:grid">
              <User className="size-[18px]" strokeWidth={1.25} />
              {user && <span className="absolute right-2 top-2 size-1.5 rounded-full bg-sage ring-2 ring-midnight" aria-hidden />}
            </IconLink>
            <IconLink href="/account/wishlist" label={`Wishlist (${saved.length})`} className="hidden sm:grid">
              <Heart className="size-[18px]" strokeWidth={1.25} />
              {saved.length > 0 && <Counter n={saved.length} tone="soft" />}
            </IconLink>
            <IconButton label={`Shopping bag (${count} items)`} onClick={() => cartDrawer.open()}>
              <ShoppingBag className="size-[18px]" strokeWidth={1.25} />
              {count > 0 && <Counter n={count} />}
            </IconButton>
          </div>
        </div>

        {/* Hairline: quiet plum at rest, champagne-to-blush once the page moves or a menu opens */}
        <span aria-hidden className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-line" />
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-0 h-px bg-[linear-gradient(90deg,transparent,var(--color-gold)_30%,var(--color-blush)_70%,transparent)] transition-opacity duration-700",
            scrolled || open ? "opacity-70" : "opacity-0",
          )}
        />

        {/* Mega menu */}
        <div
          className={cn(
            "absolute inset-x-0 top-full hidden overflow-hidden border-b border-line bg-night shadow-[var(--shadow-float)] transition-[opacity,transform,visibility] duration-500 ease-[var(--ease-lux)] xl:block",
            active ? "visible translate-y-0 opacity-100" : "invisible -translate-y-2 opacity-0",
          )}
          onMouseEnter={() => active && enter(active.slug)}
          onMouseLeave={leave}
        >
          {active && (
            <div key={active.slug} className="drop-in container-lux grid grid-cols-12 gap-10 py-11">
              <div className="col-span-3 flex flex-col">
                <p className="eyebrow text-blush">{active.eyebrow ?? active.label}</p>
                <p className="mt-4 font-serif text-[2.1rem] italic leading-[1.1] text-ink"><span className="text-gradient">{active.tagline}</span></p>
                <Link href={active.cta.href} className="group mt-auto inline-flex items-center gap-3 pt-8 text-[0.72rem] font-semibold uppercase tracking-[0.18em] text-ink hover:text-blush">
                  <span className="link-u">{active.cta.label}</span>
                  <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
                </Link>
              </div>
              <div className="col-span-4 border-l border-line pl-10">
                <p className="eyebrow text-ink-mute">Browse</p>
                <ul className="mt-5 columns-2 gap-8">
                  {active.links.map((l) => (
                    <li key={l.href} className="mb-3.5 break-inside-avoid">
                      <Link href={l.href} className="link-u font-serif text-[1.2rem] text-ink-soft transition-colors hover:text-white">{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <Link href={active.href} className="group img-zoom relative col-span-5 block aspect-[16/8] overflow-hidden bg-plum">
                <Image src={active.image} alt="" fill sizes="40vw" className="object-cover object-[50%_18%]" quality={65} />
                <span className="absolute inset-0 bg-gradient-to-t from-midnight/75 via-midnight/10 to-transparent" aria-hidden />
                <span className="pointer-events-none absolute inset-3 border border-white/20" aria-hidden />
                <span className="absolute bottom-5 left-5 flex items-center gap-3 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-porcelain">
                  Explore {active.label}
                  <span aria-hidden className="transition-transform duration-500 group-hover:translate-x-1">→</span>
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

function Counter({ n, tone = "brand" }: { n: number; tone?: "brand" | "soft" }) {
  // Re-mounts on change so the bump replays as add-to-bag / wishlist feedback
  return (
    <span
      key={n}
      className={cn(
        "bump absolute right-0.5 top-0.5 grid min-w-[17px] place-items-center rounded-full px-1 text-[0.58rem] font-bold leading-[17px] ring-2 ring-midnight",
        tone === "brand" ? "bg-burgundy text-porcelain" : "bg-rose text-midnight",
      )}
    >
      {n > 99 ? "99+" : n}
    </span>
  );
}

const iconCls = "relative grid size-10 place-items-center rounded-full text-ink transition-[color,background-color] duration-300 hover:bg-white/[0.07] hover:text-blush";

function IconButton({ label, onClick, children, className }: { label: string; onClick: () => void; children: React.ReactNode; className?: string }) {
  return (
    <button type="button" onClick={onClick} aria-label={label} title={label} className={cn(iconCls, className)}>
      {children}
    </button>
  );
}

function IconLink({ href, label, children, className }: { href: string; label: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} aria-label={label} title={label} className={cn(iconCls, className)}>
      {children}
    </Link>
  );
}

function MobileMenu({ divisions, signedIn }: { divisions: NavDivision[]; signedIn: boolean }) {
  const [expanded, setExpanded] = React.useState<string | null>(null);
  return (
    <SheetContent side="left" title="Menu" className="max-w-[min(92vw,380px)]">
      <div className="flex h-full flex-col overflow-y-auto px-6 pb-8 pt-16">
        <p className="eyebrow text-blush">Shop by division</p>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {divisions.map((d, i) => (
            <li key={d.slug} className="animate-fade-up" style={{ animationDelay: `${140 + i * 70}ms`, animationDuration: "0.7s" }}>
              <div className="flex items-center justify-between py-4">
                <SheetClose asChild>
                  <Link href={d.href} className="flex items-baseline gap-3 font-serif text-[1.65rem] text-ink">
                    <span className="font-serif text-sm italic text-gold">0{i + 1}</span>
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
        <ul className="mt-8 space-y-4 text-[0.75rem] font-medium uppercase tracking-[0.16em] text-ink-soft animate-fade-up [animation-delay:460ms]">
          {[
            ["/divisions", "Our houses"],
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
          <p className="mt-3 font-serif text-lg italic text-gold">Everything that makes you, you.</p>
        </div>
      </div>
    </SheetContent>
  );
}
