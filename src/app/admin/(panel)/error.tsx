"use client";

import { Button } from "@/components/ui/button";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="mx-auto max-w-lg border border-line bg-white p-8 text-center">
      <p className="eyebrow text-mocha">Something went wrong</p>
      <h1 className="mt-3 font-serif text-3xl">We couldn&apos;t load this page</h1>
      <p className="mt-3 text-sm text-ink-soft">
        {error.message?.includes("permission") || error.message?.includes("FORBIDDEN")
          ? "Your role doesn't have access to this data."
          : "Please try again. If the problem continues, check the server logs."}
      </p>
      {error.digest && <p className="mt-2 font-mono text-[0.65rem] text-ink-mute">Ref: {error.digest}</p>}
      <Button className="mt-6" onClick={reset}>Try again</Button>
    </div>
  );
}
