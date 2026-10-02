"use client";

import * as SelectPrimitive from "@radix-ui/react-select";
import { Check, ChevronDown, type LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import { FormField } from "./form-field";

import type { ReactNode } from "react";

export interface SelectOption {
  value: string;
  label: string;
  /** Second line, e.g. "Available ETB 8,640.00" for an account. */
  description?: string;
  icon?: LucideIcon;
}

interface SelectFieldProps {
  label: ReactNode;
  options: SelectOption[];
  value: string | undefined;
  onValueChange: (value: string) => void;
  placeholder?: string;
  hint?: ReactNode;
  error?: string | undefined;
  /** Submits the value with a native form under this name. */
  name?: string;
  disabled?: boolean;
  id?: string;
  className?: string;
}

function OptionIcon({ icon: Icon }: { icon: LucideIcon }) {
  return (
    <span className="flex size-9 shrink-0 items-center justify-center rounded-pill bg-primary-soft text-primary">
      <Icon aria-hidden="true" className="size-4.5" strokeWidth={1.75} />
    </span>
  );
}

function OptionText({ option }: { option: SelectOption }) {
  return (
    <span className="flex min-w-0 flex-col text-left">
      <span className="truncate type-body-strong text-ink">{option.label}</span>
      {option.description && (
        <span className="truncate type-caption text-ink-muted">{option.description}</span>
      )}
    </span>
  );
}

/**
 * A labelled select on Radix: keyboard (arrows, Home/End, typing to jump),
 * focus handling and ARIA come from Radix; options can show an icon and a second
 * line, which a native <select> can't (UI spec, "Account select").
 */
export function SelectField({
  label,
  options,
  value,
  onValueChange,
  placeholder = "Select…",
  hint,
  error,
  name,
  disabled,
  id,
  className,
}: SelectFieldProps) {
  const twoLine = options.some((option) => option.description);
  const selected = options.find((option) => option.value === value);

  return (
    <FormField label={label} hint={hint} error={error} id={id} className={className}>
      {(control) => (
        <SelectPrimitive.Root
          value={value}
          onValueChange={onValueChange}
          name={name}
          disabled={disabled}
        >
          <SelectPrimitive.Trigger
            {...control}
            data-invalid={error ? true : undefined}
            className={cn(
              "flex min-h-control w-full items-center gap-3 rounded-control border border-border bg-surface px-3.5 py-2",
              // Two-line options (an account with its balance) are 60 px high, as in
              // the Transfer redline; one-line ones keep the 52 px control height.
              twoLine && "min-h-15",
              "focus-control transition-[border-color,box-shadow] duration-150",
              "data-[state=open]:border-accent data-[state=open]:shadow-[0_0_0_3px_var(--color-accent-soft)]",
              "disabled:cursor-not-allowed disabled:bg-surface-muted",
            )}
          >
            <SelectPrimitive.Value
              placeholder={<span className="type-body text-ink-subtle">{placeholder}</span>}
            >
              {selected && (
                <span className="flex min-w-0 items-center gap-3">
                  {selected.icon && <OptionIcon icon={selected.icon} />}
                  <OptionText option={selected} />
                </span>
              )}
            </SelectPrimitive.Value>
            <SelectPrimitive.Icon className="ml-auto shrink-0 text-ink-muted">
              <ChevronDown aria-hidden="true" className="size-icon" strokeWidth={1.75} />
            </SelectPrimitive.Icon>
          </SelectPrimitive.Trigger>

          <SelectPrimitive.Portal>
            <SelectPrimitive.Content
              position="popper"
              sideOffset={6}
              className={cn(
                "z-50 max-h-(--radix-select-content-available-height) w-(--radix-select-trigger-width) overflow-hidden",
                "rounded-control border border-border bg-surface p-1 shadow-float",
              )}
            >
              <SelectPrimitive.Viewport>
                {options.map((option) => (
                  <SelectPrimitive.Item
                    key={option.value}
                    value={option.value}
                    className={cn(
                      "flex min-h-hit cursor-pointer items-center gap-3 rounded-[calc(var(--radius-control)-4px)] px-3 py-2 outline-none select-none",
                      "data-highlighted:bg-surface-muted data-[state=checked]:bg-primary-soft",
                    )}
                  >
                    {option.icon && <OptionIcon icon={option.icon} />}
                    <span className="flex min-w-0 flex-col">
                      <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
                      {option.description && (
                        <span className="truncate type-caption text-ink-muted">
                          {option.description}
                        </span>
                      )}
                    </span>
                    <SelectPrimitive.ItemIndicator className="ml-auto text-primary">
                      <Check aria-hidden="true" className="size-4.5" strokeWidth={2} />
                    </SelectPrimitive.ItemIndicator>
                  </SelectPrimitive.Item>
                ))}
              </SelectPrimitive.Viewport>
            </SelectPrimitive.Content>
          </SelectPrimitive.Portal>
        </SelectPrimitive.Root>
      )}
    </FormField>
  );
}
