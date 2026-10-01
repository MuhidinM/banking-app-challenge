"use client";

import { useId } from "react";

import { cn } from "@/shared/lib/cn";

import type { LucideIcon } from "lucide-react";

export interface FilterOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  /** Icon colour while not selected, e.g. "text-credit" for "Money in". */
  iconClassName?: string;
}

interface FilterPillsProps<T extends string> {
  /** Names the group for screen readers, e.g. "Show". Visually hidden. */
  label: string;
  options: FilterOption<T>[];
  value: T;
  onValueChange: (value: T) => void;
  className?: string;
}

/**
 * Filter pills (component sheet "Filters": H 44, radius 999, padding 0 16),
 * e.g. All / Money in / Money out. Native radio buttons, so one tab stop,
 * arrow keys to switch, and "1 of 3" announced by screen readers.
 */
export function FilterPills<T extends string>({
  label,
  options,
  value,
  onValueChange,
  className,
}: FilterPillsProps<T>) {
  const name = useId();

  return (
    <fieldset className={className}>
      <legend className="sr-only">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map(({ value: optionValue, label: optionLabel, icon: Icon, iconClassName }) => (
          <label
            key={optionValue}
            className={cn(
              "group inline-flex h-control-compact cursor-pointer items-center gap-2 rounded-pill border border-border bg-surface px-4",
              "type-body text-ink-muted transition-colors hover:text-ink",
              "has-checked:border-primary has-checked:bg-primary has-checked:font-medium has-checked:text-on-primary",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
            )}
          >
            <input
              type="radio"
              name={name}
              value={optionValue}
              checked={value === optionValue}
              onChange={() => onValueChange(optionValue)}
              className="sr-only"
            />
            {Icon && (
              <Icon
                aria-hidden="true"
                className={cn(
                  "size-4 shrink-0",
                  iconClassName,
                  "group-has-checked:text-on-primary",
                )}
                strokeWidth={2}
              />
            )}
            {optionLabel}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
