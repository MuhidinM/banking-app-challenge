import { cn } from "@/shared/lib/cn";

import { ControlFrame, FormField } from "./form-field";

import type { FocusEventHandler, ReactNode } from "react";

export interface QuickAmount {
  /** Chip text, e.g. "+500" or "Max". */
  label: string;
  onSelect: () => void;
}

interface AmountFieldProps {
  label: ReactNode;
  /** The amount as typed, e.g. "250" or "250.5". The form converts it to cents. */
  value: string;
  onChange: (value: string) => void;
  onBlur?: FocusEventHandler<HTMLInputElement>;
  hint?: ReactNode;
  error?: string | undefined;
  /** Shortcut chips under the field: +100, +500, +1,000, Max (UI spec, Money inputs). */
  quickAmounts?: QuickAmount[];
  currency?: string;
  name?: string;
  id?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  className?: string;
}

/**
 * Keeps what can be typed to a positive amount: digits, one decimal point and at
 * most two decimals. Thousands separators and spaces are dropped (so pasting
 * "1,250.00" works); minus signs and letters can't be entered at all.
 */
export function sanitizeAmountInput(raw: string): string {
  const cleaned = raw.replace(/[^\d.]/g, "");
  const [whole = "", ...rest] = cleaned.split(".");
  if (rest.length === 0) return whole;
  return `${whole}.${rest.join("").slice(0, 2)}`;
}

/** The large amount input with the currency prefix and optional quick-amount chips. */
export function AmountField({
  label,
  value,
  onChange,
  onBlur,
  hint,
  error,
  quickAmounts,
  currency = "ETB",
  name,
  id,
  disabled,
  autoFocus,
  className,
}: AmountFieldProps) {
  return (
    <FormField
      label={label}
      hint={hint}
      error={error}
      id={id}
      className={className}
      after={
        quickAmounts && quickAmounts.length > 0 ? (
          <div className="mt-1 flex flex-wrap gap-2">
            {quickAmounts.map((chip) => (
              <button
                key={chip.label}
                type="button"
                onClick={chip.onSelect}
                disabled={disabled}
                className="h-control-compact rounded-pill border border-border bg-surface px-4 type-body amount text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-55"
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null
      }
    >
      {(control) => (
        <ControlFrame invalid={Boolean(error)} disabled={disabled} className="h-15 gap-2">
          <span aria-hidden="true" className="type-body-strong text-ink-muted">
            {currency}
          </span>
          <input
            {...control}
            name={name}
            type="text"
            inputMode="decimal"
            autoComplete="off"
            placeholder="0.00"
            value={value}
            onChange={(event) => onChange(sanitizeAmountInput(event.target.value))}
            onBlur={onBlur}
            disabled={disabled}
            // The visible "ETB" prefix is decorative; this keeps the currency in the accessible name.
            aria-label={typeof label === "string" ? `${label} in ${currency}` : undefined}
            // eslint-disable-next-line jsx-a11y/no-autofocus -- only where a screen's main task is entering an amount
            autoFocus={autoFocus}
            className={cn(
              "min-w-0 flex-1 bg-transparent type-title amount text-ink outline-none",
              "placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:text-ink-subtle",
            )}
          />
        </ControlFrame>
      )}
    </FormField>
  );
}
