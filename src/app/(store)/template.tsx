"use client";

import * as React from "react";
import { AutoReveal } from "@/components/ui/auto-reveal";

/**
 * Page transition for the storefront. A template re-mounts on every route
 * change, so new content can rise in with a short CSS animation — there is no
 * exit phase, so navigation is never held back. The very first paint (server
 * render + hydration) is left untouched to protect LCP.
 */
let hasNavigated = false;

export default function StoreTemplate({ children }: { children: React.ReactNode }) {
  const [enter] = React.useState(() => hasNavigated);
  React.useEffect(() => {
    hasNavigated = true;
  }, []);
  return (
    <div className={enter ? "page-enter" : undefined}>
      {children}
      {/* scroll reveals for every storefront page (admin has its own layout and never mounts this) */}
      <AutoReveal />
    </div>
  );
}
