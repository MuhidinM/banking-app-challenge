import { Check } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import type { ReactNode } from "react";

interface ReceiptProps {
  /** "Transfer sent", "Bill paid". The page's h1. */
  title: string;
  /** One line under the title, e.g. "ETB 250.00 to 2899010846". */
  summary: ReactNode;
  /** Label and value pairs, in order: From, Date, Reference, New balance. */
  rows: [label: string, value: ReactNode][];
  /** Under the rows, e.g. why the reference is missing. */
  note?: ReactNode;
  /** "Share receipt" and "Done", stacked full width. */
  actions: ReactNode;
  className?: string;
}

/**
 * A payment's confirmation (UI spec, mobile TransferSuccess): a green check,
 * the title and amount, a card of details, then the actions. Used for
 * transfers and bill payments alike.
 */
export function Receipt({ title, summary, rows, note, actions, className }: ReceiptProps) {
  return (
    <div className={cn("mx-auto flex w-full max-w-md flex-col gap-6", className)}>
      <div className="flex flex-col items-center gap-3 text-center">
        <span className="flex size-22 items-center justify-center rounded-pill bg-credit-soft text-credit">
          <Check aria-hidden="true" className="size-11" strokeWidth={2.25} />
        </span>
        <h1 tabIndex={-1} data-page-heading="" className="type-title text-ink outline-none">
          {title}
        </h1>
        <p className="type-body-strong font-normal amount whitespace-normal text-ink-muted">
          {summary}
        </p>
      </div>

      <dl className="divide-y divide-border rounded-card border border-border bg-surface shadow-card">
        {rows.map(([label, value]) => (
          <div key={label} className="flex items-baseline justify-between gap-4 px-5 py-4">
            <dt className="type-body text-ink-muted">{label}</dt>
            <dd className="min-w-0 text-right type-body-strong font-normal amount text-ink">
              {value}
            </dd>
          </div>
        ))}
      </dl>
      {note ? <p className="-mt-3 type-caption text-ink-muted">{note}</p> : null}

      <div className="mt-2 flex flex-col gap-3">{actions}</div>
    </div>
  );
}
