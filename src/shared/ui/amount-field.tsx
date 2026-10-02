import { type ChangeEvent, useLayoutEffect, useRef } from "react";

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
  /** The amount as shown, e.g. "250" or "1,250.5". The form converts it to cents. */
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

/**
 * Adds thousands separators as the amount is typed: "1250.5" → "1,250.5".
 * The decimals stay as typed, and leading zeros go ("007" → "7"). Expects
 * sanitized input; the forms parse the commas away (parseAmountInput).
 */
export function groupAmountInput(sanitized: string): string {
  const [whole = "", fraction] = sanitized.split(".");
  const digits = whole.replace(/^0+(?=\d)/, "");
  const grouped = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  return fraction === undefined ? grouped : `${grouped}.${fraction}`;
}

/** Where the caret goes in `formatted` to sit after the same `count` digits and points. */
function caretAfter(formatted: string, count: number): number {
  if (count === 0) return 0;
  let seen = 0;
  for (let index = 0; index < formatted.length; index++) {
    if (formatted[index] !== ",") seen++;
    if (seen === count) return index + 1;
  }
  return formatted.length;
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
  const inputRef = useRef<HTMLInputElement>(null);
  // Adding or removing a comma would otherwise throw the caret to the end.
  const caret = useRef<number | null>(null);
  useLayoutEffect(() => {
    if (caret.current === null || document.activeElement !== inputRef.current) return;
    inputRef.current?.setSelectionRange(caret.current, caret.current);
    caret.current = null;
  }, [value]);

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const { value: raw, selectionStart } = event.target;
    const next = groupAmountInput(sanitizeAmountInput(raw));
    if (selectionStart !== null) {
      // Count what sits before the caret, ignoring commas, and put it back after that much.
      const kept = sanitizeAmountInput(raw.slice(0, selectionStart)).replace(/^0+(?=\d)/, "");
      caret.current = caretAfter(next, kept.length);
    }
    onChange(next);
  }

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
            ref={inputRef}
            onChange={handleChange}
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
