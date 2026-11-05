import * as React from "react";
import { cn } from "@/lib/utils";

/** Panel wrapper with an accessible table view (<details>) for every chart. */
export function ChartPanel({
  title,
  subtitle,
  action,
  table,
  children,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
  table?: { columns: string[]; rows: (string | number)[][] };
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("border border-line bg-white p-5", className)}>
      <header className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h2 className="font-serif text-xl text-espresso">{title}</h2>
          {subtitle && <p className="mt-0.5 text-xs text-ink-mute">{subtitle}</p>}
        </div>
        {action}
      </header>
      {children}
      {table && table.rows.length > 0 && (
        <details className="mt-4 border-t border-line pt-3 text-xs">
          <summary className="cursor-pointer select-none text-ink-mute hover:text-espresso">View as table</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left tabular-nums">
              <thead>
                <tr className="text-ink-mute">
                  {table.columns.map((c) => (
                    <th key={c} className="py-1 pr-4 font-medium">{c}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((r, i) => (
                  <tr key={i} className="border-t border-line/70">
                    {r.map((c, j) => (
                      <td key={j} className="py-1 pr-4 text-ink-soft">{c}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </section>
  );
}
