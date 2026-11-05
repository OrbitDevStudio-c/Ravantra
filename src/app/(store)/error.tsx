"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function StoreError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div className="container-lux grid min-h-[60vh] place-items-center py-24 text-center">
      <div>
        <p className="eyebrow text-mocha">Something went wrong</p>
        <h1 className="display mt-4 text-5xl">We hit a snag.</h1>
        <p className="mx-auto mt-4 max-w-md text-sm text-ink-soft">Please try again. If it keeps happening, our client care team is happy to help.</p>
        <div className="mt-8 flex justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <Button variant="outline" asChild><Link href="/">Go home</Link></Button>
        </div>
        {error.digest && <p className="mt-6 text-[0.65rem] text-ink-mute">Ref: {error.digest}</p>}
      </div>
    </div>
  );
}
