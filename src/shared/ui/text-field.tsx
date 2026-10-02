"use client";

import { Eye, EyeOff, Lock, type LucideIcon } from "lucide-react";
import { type InputHTMLAttributes, type ReactNode, useState } from "react";

import { ControlFrame, FormField, inputClasses } from "./form-field";

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, "id" | "children">;

interface TextFieldProps extends InputProps {
  label: ReactNode;
  hint?: ReactNode;
  error?: string | undefined;
  /** Leading outline icon, e.g. User for the username. */
  icon?: LucideIcon;
  id?: string;
  className?: string;
}

/**
 * A labelled single-line input with an optional icon, hint and error.
 * Spreads extra props (name, inputMode, autoComplete, handlers) onto the <input>.
 */
export function TextField({
  label,
  hint,
  error,
  icon,
  id,
  className,
  disabled,
  ...input
}: TextFieldProps) {
  return (
    <FormField label={label} hint={hint} error={error} id={id} className={className}>
      {(control) => (
        <ControlFrame icon={icon} invalid={Boolean(error)} disabled={disabled}>
          <input {...control} {...input} disabled={disabled} className={inputClasses} />
        </ControlFrame>
      )}
    </FormField>
  );
}

type PasswordFieldProps = Omit<TextFieldProps, "type" | "icon">;

/** A password input with a lock icon and a show/hide button (UI spec, Login). */
export function PasswordField({
  label,
  hint,
  error,
  id,
  className,
  disabled,
  ...input
}: PasswordFieldProps) {
  const [visible, setVisible] = useState(false);

  return (
    <FormField label={label} hint={hint} error={error} id={id} className={className}>
      {(control) => (
        <ControlFrame icon={Lock} invalid={Boolean(error)} disabled={disabled}>
          <input
            {...control}
            {...input}
            type={visible ? "text" : "password"}
            disabled={disabled}
            className={inputClasses}
          />
          <button
            type="button"
            onClick={() => setVisible((shown) => !shown)}
            disabled={disabled}
            aria-label={visible ? "Hide password" : "Show password"}
            aria-pressed={visible}
            aria-controls={control.id}
            className="-mr-2 flex size-hit shrink-0 items-center justify-center rounded-button text-ink-muted hover:text-ink disabled:cursor-not-allowed"
          >
            {visible ? (
              <EyeOff aria-hidden="true" className="size-icon" strokeWidth={1.75} />
            ) : (
              <Eye aria-hidden="true" className="size-icon" strokeWidth={1.75} />
            )}
          </button>
        </ControlFrame>
      )}
    </FormField>
  );
}
