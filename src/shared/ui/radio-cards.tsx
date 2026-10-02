"use client";

import { CircleAlert, CircleCheck, type LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";

import { cn } from "@/shared/lib/cn";

export interface RadioCardOption {
  value: string;
  label: string;
  description?: string;
  icon?: LucideIcon;
}

interface RadioCardsProps {
  label: ReactNode;
  options: RadioCardOption[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  error?: string | undefined;
  /** Submits the value with a native form under this name. */
  name?: string;
  disabled?: boolean;
  className?: string;
}

/**
 * One choice from a short list, shown as cards (UI spec, "Open an account":
 * redline: 40 px icon disc, 23 px check, 12/14 px padding, 10 px between cards;
 * Savings / Checking / Money market). Native radio buttons in a fieldset, so the
 * browser provides the radio group, a single tab stop and arrow-key selection.
 */
export function RadioCards({
  label,
  options,
  value,
  onValueChange,
  error,
  name,
  disabled,
  className,
}: RadioCardsProps) {
  const id = useId();
  const groupName = name ?? id;
  const errorId = `${id}-error`;

  return (
    <fieldset
      disabled={disabled}
      aria-describedby={error ? errorId : undefined}
      aria-invalid={error ? true : undefined}
      className={cn("flex flex-col gap-1.5", className)}
    >
      <legend className="mb-1.5 type-label text-ink">{label}</legend>

      <div className="flex flex-col gap-2.5">
        {options.map(({ value: optionValue, label: optionLabel, description, icon: Icon }) => (
          <label
            key={optionValue}
            className={cn(
              "group flex min-h-row w-full cursor-pointer items-center gap-3 rounded-control border border-border bg-surface px-3.5 py-3",
              "transition-[border-color,box-shadow] duration-150 hover:bg-surface-muted",
              "has-checked:border-primary has-checked:shadow-[0_0_0_3px_var(--color-primary-soft)]",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
              "has-disabled:cursor-not-allowed has-disabled:opacity-55",
            )}
          >
            <input
              type="radio"
              name={groupName}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onValueChange(optionValue)}
              className="sr-only"
            />
            {Icon && (
              <span className="flex size-10 shrink-0 items-center justify-center rounded-pill bg-surface-muted text-ink group-has-checked:bg-primary-soft group-has-checked:text-primary">
                <Icon aria-hidden="true" className="size-icon" strokeWidth={1.75} />
              </span>
            )}
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="type-body-strong text-ink">{optionLabel}</span>
              {description && <span className="type-caption text-ink-muted">{description}</span>}
            </span>
            {/* Empty circle when unselected, check when selected, like the spec. */}
            <span
              aria-hidden="true"
              className="size-[1.4375rem] shrink-0 rounded-pill border-[1.5px] border-border group-has-checked:hidden"
            />
            <CircleCheck
              aria-hidden="true"
              className="hidden size-[1.4375rem] shrink-0 text-primary group-has-checked:block"
              strokeWidth={2}
            />
          </label>
        ))}
      </div>

      <div aria-live="polite" className="empty:hidden">
        {error ? (
          <p id={errorId} className="flex items-start gap-1.5 type-caption text-debit">
            <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" strokeWidth={2} />
            {error}
          </p>
        ) : null}
      </div>
    </fieldset>
  );
}
