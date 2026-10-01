import { CircleAlert, type LucideIcon, RotateCw, WifiOff } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import { Button } from "./button";

import type { ReactNode } from "react";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  /** The next step, e.g. a "Open an account" button. */
  action?: ReactNode;
  className?: string;
}

/** Shown when a list has nothing in it yet, with the next step if there is one. */
export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-card py-10 text-center", className)}>
      <span className="flex size-14 items-center justify-center rounded-pill bg-primary-soft text-primary">
        <Icon aria-hidden="true" className="size-6.5" strokeWidth={1.75} />
      </span>
      <div className="flex max-w-xs flex-col gap-1">
        <p className="type-body-strong text-ink">{title}</p>
        {description && <p className="type-body text-ink-muted">{description}</p>}
      </div>
      {action && <div className="mt-1">{action}</div>}
    </div>
  );
}

interface ErrorStateProps {
  /** Already in user-facing words; never the server's raw message. */
  title?: string;
  description?: ReactNode;
  /** Shows a "Try again" button. */
  onRetry?: () => void;
  /** Shows the retry button as busy while the retry is in flight. */
  retrying?: boolean;
  /** "offline" uses a no-connection icon. */
  kind?: "error" | "offline";
  className?: string;
}

/**
 * Shown in place of content that failed to load, with a way to try again.
 * role="alert" so it is announced when it replaces a loading state.
 */
export function ErrorState({
  title = "We couldn't load this",
  description = "Something went wrong on our side. Please try again.",
  onRetry,
  retrying = false,
  kind = "error",
  className,
}: ErrorStateProps) {
  const Icon = kind === "offline" ? WifiOff : CircleAlert;
  return (
    <div
      role="alert"
      className={cn("flex flex-col items-center gap-3 px-card py-10 text-center", className)}
    >
      <span className="flex size-14 items-center justify-center rounded-pill bg-debit-soft text-debit">
        <Icon aria-hidden="true" className="size-6.5" strokeWidth={1.75} />
      </span>
      <div className="flex max-w-xs flex-col gap-1">
        <p className="type-body-strong text-ink">{title}</p>
        {description && <p className="type-body text-ink-muted">{description}</p>}
      </div>
      {onRetry && (
        <Button
          variant="outline"
          size="compact"
          icon={RotateCw}
          loading={retrying}
          onClick={onRetry}
        >
          Try again
        </Button>
      )}
    </div>
  );
}
