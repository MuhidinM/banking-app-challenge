"use client";

import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";

import { type ThemePreference, isThemePreference } from "./theme-preference";
import { useTheme } from "./use-theme";

const options: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

interface ThemeToggleProps {
  /** "labels" shows icon and text (profile); "icons" shows icons only (sidebar). */
  variant?: "labels" | "icons";
  className?: string;
}

/**
 * Lets the user choose System, Light or Dark. Built on native radio buttons, so
 * arrow keys move between options and screen readers announce "Theme, radio
 * group, 1 of 3". Styled like the spec's filter pills.
 */
export function ThemeToggle({ variant = "labels", className = "" }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme();
  const name = useId();

  return (
    <fieldset className={className}>
      <legend className={variant === "icons" ? "sr-only" : "mb-2 type-label text-ink-muted"}>
        Theme
      </legend>
      <div className="inline-flex gap-1 rounded-pill border border-border bg-surface p-1">
        {options.map(({ value, label, Icon }) => (
          <label
            key={value}
            title={variant === "icons" ? label : undefined}
            className={[
              "inline-flex min-h-hit min-w-hit cursor-pointer items-center justify-center gap-2 rounded-pill type-label",
              "text-ink-muted transition-colors hover:text-ink",
              "has-checked:bg-primary has-checked:text-on-primary",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
              // One padding per variant: two px-* classes would be decided by CSS order, not by this list.
              variant === "icons" ? "px-0" : "px-4",
            ].join(" ")}
          >
            <input
              type="radio"
              name={name}
              value={value}
              checked={preference === value}
              onChange={(event) => {
                if (isThemePreference(event.target.value)) setPreference(event.target.value);
              }}
              className="sr-only"
            />
            <Icon aria-hidden="true" className="size-icon shrink-0" strokeWidth={1.75} />
            <span className={variant === "icons" ? "sr-only" : undefined}>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
