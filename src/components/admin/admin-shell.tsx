"use client";

import * as React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Boxes,
  CalendarClock,
  ExternalLink,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Package,
  Scissors,
  ShieldCheck,
  ShoppingCart,
  Store,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Logo } from "@/components/ui/logo";
import { signOut } from "@/features/auth/actions";
import { cn, initials } from "@/lib/utils";

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutDashboard,
  divisions: Store,
  products: Package,
  inventory: Boxes,
  orders: ShoppingCart,
  appointments: CalendarClock,
  salon: Scissors,
  customers: Users,
  marketing: Megaphone,
  reports: BarChart3,
  staff: ShieldCheck,
  stylists: UserRound,
};

export interface NavGroup {
  label: string;
  items: { href: string; label: string; icon: keyof typeof ICONS | string; exact?: boolean }[];
}

export function AdminShell({
  groups,
  user,
  preview,
  children,
}: {
  groups: NavGroup[];
  user: { name: string; email: string; role: string };
  preview: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-dvh bg-[#F4F1EB] lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="sticky top-0 hidden h-dvh flex-col bg-espresso text-ivory lg:flex">
        <SidebarInner groups={groups} />
      </aside>
      <div className="flex min-w-0 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-line bg-[#F4F1EB]/90 px-4 backdrop-blur md:px-8">
          <Sheet>
            <SheetTrigger asChild>
              <button className="-ml-1 grid size-9 place-items-center lg:hidden" aria-label="Open navigation">
                <Menu className="size-5" strokeWidth={1.25} />
              </button>
            </SheetTrigger>
            <SheetContent side="left" title="Admin navigation" className="max-w-[280px] bg-espresso text-ivory">
              <SidebarInner groups={groups} mobile />
            </SheetContent>
          </Sheet>
          <Link href="/admin" className="lg:hidden" aria-label="RAVANTRA admin"><Logo variant="lockup" height={34} /></Link>
          {preview && (
            <span className="hidden border border-gold/50 bg-gold/15 px-2 py-0.5 text-[0.65rem] uppercase tracking-[0.14em] text-gold-deep sm:inline">
              Preview · read-only demo data
            </span>
          )}
          <div className="ml-auto flex items-center gap-3">
            <Link href="/" target="_blank" className="hidden items-center gap-1.5 text-xs text-ink-soft hover:text-espresso md:flex">
              View store <ExternalLink className="size-3" />
            </Link>
            <div className="flex items-center gap-2.5 border-l border-line pl-3">
              <span className="grid size-8 place-items-center rounded-full bg-espresso text-[0.65rem] font-medium text-ivory">{initials(user.name || user.email)}</span>
              <div className="hidden leading-tight sm:block">
                <p className="text-xs font-medium text-espresso">{user.name}</p>
                <p className="text-[0.65rem] uppercase tracking-[0.12em] text-mocha">{user.role}</p>
              </div>
              {!preview && (
                <form action={signOut}>
                  <button className="grid size-8 place-items-center text-ink-mute hover:text-danger" aria-label="Sign out" title="Sign out">
                    <LogOut className="size-4" strokeWidth={1.5} />
                  </button>
                </form>
              )}
            </div>
          </div>
        </header>
        {preview && (
          <div className="border-b border-gold/30 bg-gold/10 px-4 py-2 text-xs text-espresso md:px-8">
            <strong className="font-medium">Preview mode.</strong> Supabase isn&apos;t configured, so you&apos;re viewing the admin with bundled demo data. Changes are disabled — connect Supabase and sign in as a staff account to manage live data.
          </div>
        )}
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-8">{children}</main>
      </div>
    </div>
  );
}

function SidebarInner({ groups, mobile }: { groups: NavGroup[]; mobile?: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string, exact?: boolean) => (exact ? pathname === href : pathname === href || pathname.startsWith(href + "/"));
  return (
    <div className="flex h-full flex-col overflow-y-auto">
      <Link href="/admin" className="px-6 pb-6 pt-7">
        <Logo variant="lockup" tone="light" height={42} />
        <span className="mt-3 block text-[0.58rem] uppercase tracking-[0.3em] text-gold">Central administration</span>
      </Link>
      <nav className="flex-1 space-y-6 px-3 pb-6" aria-label="Admin">
        {groups.map((g) => (
          <div key={g.label}>
            <p className="px-3 pb-2 text-[0.58rem] uppercase tracking-[0.24em] text-ivory/40">{g.label}</p>
            <ul className="space-y-0.5">
              {g.items.map((item) => {
                const Icon = ICONS[item.icon] ?? LayoutDashboard;
                const active = isActive(item.href, item.exact);
                const link = (
                  <Link
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 px-3 py-2 text-[0.82rem] transition-colors",
                      active ? "bg-ivory/10 text-ivory" : "text-ivory/65 hover:bg-ivory/5 hover:text-ivory",
                    )}
                  >
                    <span className={cn("h-4 w-px transition-colors", active ? "bg-gold" : "bg-transparent")} aria-hidden />
                    <Icon className="size-4 shrink-0" strokeWidth={1.4} />
                    {item.label}
                  </Link>
                );
                return <li key={item.href}>{mobile ? <SheetClose asChild>{link}</SheetClose> : link}</li>;
              })}
            </ul>
          </div>
        ))}
      </nav>
      <p className="border-t border-ivory/10 px-6 py-4 text-[0.6rem] leading-relaxed text-ivory/35">
        Built by OrbitDevStudio
      </p>
    </div>
  );
}
