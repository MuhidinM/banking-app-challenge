import { CircleAlert, type LucideIcon } from "lucide-react";
import { type ReactNode, useId } from "react";

import { cn } from "@/shared/lib/cn";

/** Props a field passes to its input so the label, hint and error are announced with it. */
export interface FieldControlProps {
  id: string;
  "aria-describedby": string | undefined;
  "aria-invalid": true | undefined;
}

interface FormFieldProps {
  label: ReactNode;
  /** Shown under the control, e.g. "Kifiya Bank account numbers have 10 digits." */
  hint?: ReactNode;
  /** Replaces the hint and marks the control invalid. Already in user-facing words. */
  error?: string | undefined;
  /** Use the given id for the control instead of generating one. */
  id?: string;
  /** Rendered below the hint or error, e.g. quick-amount chips. */
  after?: ReactNode;
  className?: string;
  children: (control: FieldControlProps) => ReactNode;
}

/**
 * Label above, control, then hint or error below (UI spec: label to control 6px).
 * The error area is a polite live region, so a new error is read out without
 * moving focus.
 */
export function FormField({ label, hint, error, id, after, className, children }: FormFieldProps) {
  const generatedId = useId();
  const controlId = id ?? generatedId;
  const hintId = `${controlId}-hint`;
  const errorId = `${controlId}-error`;

  const describedBy = [error ? errorId : hint ? hintId : undefined].filter(Boolean).join(" ");

  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={controlId} className="type-label text-ink">
        {label}
      </label>

      {children({
        id: controlId,
        "aria-describedby": describedBy || undefined,
        "aria-invalid": error ? true : undefined,
      })}

      <div aria-live="polite" className="empty:hidden">
        {error ? (
          <p id={errorId} className="flex items-start gap-1.5 type-caption text-debit">
            <CircleAlert aria-hidden="true" className="mt-px size-3.5 shrink-0" strokeWidth={2} />
            {error}
          </p>
        ) : null}
      </div>
      {!error && hint ? (
        <p id={hintId} className="type-caption text-ink-muted">
          {hint}
        </p>
      ) : null}
      {after}
    </div>
  );
}

interface ControlFrameProps {
  invalid?: boolean;
  disabled?: boolean;
  icon?: LucideIcon | undefined;
  className?: string;
  children: ReactNode;
}

/**
 * The outlined box around an input (UI spec, field style C): 52px, radius 12,
 * 14px padding, 1px border, leading icon. Focus and error rings live here, so
 * the icon and any prefix sit inside them.
 */
export function ControlFrame({
  invalid,
  disabled,
  icon: Icon,
  className,
  children,
}: ControlFrameProps) {
  return (
    <div
      data-invalid={invalid || undefined}
      className={cn(
        "flex min-h-control items-center gap-3 rounded-control border border-border bg-surface px-3.5",
        "focus-control transition-[border-color,box-shadow] duration-150",
        disabled && "bg-surface-muted text-ink-subtle",
        className,
      )}
    >
      {Icon && (
        <Icon aria-hidden="true" className="size-icon shrink-0 text-ink-muted" strokeWidth={1.75} />
      )}
      {children}
    </div>
  );
}

/** Classes for the bare <input> inside a ControlFrame. */
export const inputClasses =
  "min-w-0 flex-1 bg-transparent type-body-strong text-ink outline-none placeholder:font-normal placeholder:text-ink-subtle disabled:cursor-not-allowed disabled:text-ink-subtle";
