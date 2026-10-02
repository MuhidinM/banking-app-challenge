import { Slot, Slottable } from "@radix-ui/react-slot";
import { LoaderCircle, type LucideIcon } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import type { ButtonHTMLAttributes, ReactNode } from "react";

// UI spec, component sheet "Buttons": 52px default and 44px compact, radius 14,
// 20px side padding. One primary action per screen.
const variants = {
  primary: "bg-primary text-on-primary hover:bg-primary-hover",
  soft: "bg-primary-soft text-primary hover:brightness-95",
  outline: "border border-border bg-surface text-ink hover:bg-surface-muted",
  ghost: "bg-transparent text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger: "bg-debit text-on-primary hover:brightness-95",
} as const;

const sizes = {
  // Redlines (Login, Transfer, NewAccount): button labels are Montserrat 16/500.
  default: "h-button text-base leading-[1.4] font-medium",
  compact: "h-button-compact type-body font-medium",
} as const;

export type ButtonVariant = keyof typeof variants;
export type ButtonSize = keyof typeof sizes;

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Leading outline icon. */
  icon?: LucideIcon;
  /** Shows a spinner, disables the button and sets aria-busy. The width doesn't change. */
  loading?: boolean;
  fullWidth?: boolean;
  /** Render the child element (e.g. a Next.js <Link>) with button styles instead of a <button>. */
  asChild?: boolean;
  children: ReactNode;
}

export function Button({
  variant = "primary",
  size = "default",
  icon: Icon,
  loading = false,
  fullWidth = false,
  asChild = false,
  disabled,
  type = "button",
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-button px-5 select-none",
    "transition-[background-color,color,filter] duration-150",
    "disabled:cursor-not-allowed disabled:opacity-55 disabled:hover:brightness-100",
    // Loading is disabled too, but keeps full colour like the spec (only "Disabled" fades).
    "aria-busy:cursor-progress aria-busy:opacity-100",
    variants[variant],
    sizes[size],
    variant === "primary" && "disabled:hover:bg-primary",
    fullWidth && "w-full",
    className,
  );

  if (asChild) {
    // Slottable puts the icon inside the child element (e.g. a Next.js <Link>),
    // before its own text, so a link styled as a button keeps its icon.
    return (
      <Slot className={classes} {...props}>
        {Icon && <Icon aria-hidden="true" className="size-icon shrink-0" strokeWidth={1.75} />}
        <Slottable>{children}</Slottable>
      </Slot>
    );
  }

  // While loading, the spinner takes the icon's place (same size), or sits just
  // left of the label inside the padding, so the button never changes width.
  const spinner = (size: string) => (
    <LoaderCircle
      aria-hidden="true"
      className={cn(size, "shrink-0 animate-spin")}
      strokeWidth={2}
    />
  );

  return (
    <button
      type={type}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {loading && Icon
        ? spinner("size-icon")
        : Icon && <Icon aria-hidden="true" className="size-icon shrink-0" strokeWidth={1.75} />}
      <span className="relative">
        {loading && !Icon && (
          <span className="absolute top-1/2 right-full mr-1 flex -translate-y-1/2">
            {spinner("size-4")}
          </span>
        )}
        {children}
      </span>
    </button>
  );
}
