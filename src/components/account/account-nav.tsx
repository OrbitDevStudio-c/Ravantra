"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "@/features/auth/actions";
import { cn } from "@/lib/utils";

const LINKS = [
  ["/account", "Overview"],
  ["/account/orders", "Orders"],
  ["/account/appointments", "Appointments"],
  ["/account/wishlist", "Wishlist"],
  ["/account/addresses", "Addresses"],
  ["/account/profile", "Profile & security"],
] as const;

export function AccountNav() {
  const path = usePathname();
  return (
    <nav aria-label="Account" className="no-scrollbar -mx-4 flex gap-1 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:gap-0 lg:px-0">
      {LINKS.map(([href, label]) => {
        const active = href === "/account" ? path === href : path.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 px-3 py-3 text-sm transition lg:border-b-0 lg:border-l-2 lg:px-5",
              active ? "border-espresso text-espresso" : "border-transparent text-ink-soft hover:text-espresso",
            )}
          >
            {label}
          </Link>
        );
      })}
      <form action={signOut} className="shrink-0 lg:mt-6">
        <button className="px-3 py-3 text-sm text-ink-mute hover:text-danger lg:px-5">Sign out</button>
      </form>
    </nav>
  );
}
