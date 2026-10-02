"use client";

import { type LucideIcon, Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";

import { cn } from "@/shared/lib/cn";

import { type ThemePreference, isThemePreference } from "./theme-preference";
import { useTheme } from "./use-theme";

const options: { value: ThemePreference; label: string; Icon: LucideIcon }[] = [
  { value: "system", label: "System", Icon: Monitor },
  { value: "light", label: "Light", Icon: Sun },
  { value: "dark", label: "Dark", Icon: Moon },
];

interface ThemeToggleProps {
  /** Shares the full width between the options, e.g. in a narrow card on a phone. */
  fullWidth?: boolean;
  className?: string;
}

/**
 * Lets the user choose System, Light or Dark. Built on native radio buttons, so
 * arrow keys move between options and screen readers announce "Theme, radio
 * group, 1 of 3". Styled like the spec's filter pills. Only on the profile
 * page: no screen in the spec has one (N-018).
 */
export function ThemeToggle({ fullWidth = false, className }: ThemeToggleProps) {
  const { preference, setPreference } = useTheme();
  const name = useId();

  return (
    <fieldset className={className}>
      <legend className="mb-2 type-label text-ink-muted">Theme</legend>
      <div
        className={cn(
          "inline-flex gap-1 rounded-pill border border-border bg-surface p-1",
          fullWidth && "flex w-full",
        )}
      >
        {options.map(({ value, label, Icon }) => (
          <label
            key={value}
            className={cn(
              "inline-flex min-h-hit min-w-hit cursor-pointer items-center justify-center gap-2 rounded-pill px-4 type-label",
              "text-ink-muted transition-colors hover:text-ink",
              "has-checked:bg-primary has-checked:text-on-primary",
              "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-accent",
              fullWidth && "flex-1 gap-1.5 px-2",
            )}
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
            <span>{label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
