import { CircleAlert, CircleCheck, Info, type LucideIcon, TriangleAlert } from "lucide-react";

import { cn } from "@/shared/lib/cn";

import type { ReactNode } from "react";

// Component sheet "feedback" (info, success) and the transfer review's
// irreversible-transfer warning; error follows the same pattern.
const messageTones = {
  info: { classes: "bg-primary-soft text-ink", iconClass: "text-primary", icon: Info },
  success: { classes: "bg-credit-soft text-ink", iconClass: "text-credit", icon: CircleCheck },
  warning: {
    classes: "bg-warning-soft text-warning",
    iconClass: "text-warning",
    icon: TriangleAlert,
  },
  error: { classes: "bg-debit-soft text-debit", iconClass: "text-debit", icon: CircleAlert },
} satisfies Record<string, { classes: string; iconClass: string; icon: LucideIcon }>;

export type MessageTone = keyof typeof messageTones;

interface InlineMessageProps {
  tone?: MessageTone;
  children: ReactNode;
  /**
   * Announce it when it appears: "polite" for status (e.g. "Your session expired"),
   * "assertive" for errors that block the task. Omit for messages present from the start.
   */
  announce?: "polite" | "assertive";
  className?: string;
}

/** A tinted message box: info, success, warning or error. */
export function InlineMessage({
  tone = "info",
  children,
  announce,
  className,
}: InlineMessageProps) {
  const { classes, iconClass, icon: Icon } = messageTones[tone];
  const role = announce === "assertive" ? "alert" : announce === "polite" ? "status" : undefined;

  return (
    <div
      role={role}
      className={cn(
        "flex items-start gap-3 rounded-control px-4 py-3 type-body",
        classes,
        className,
      )}
    >
      <Icon
        aria-hidden="true"
        className={cn("mt-px size-icon shrink-0", iconClass)}
        strokeWidth={1.75}
      />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

const badgeTones = {
  neutral: "bg-surface-muted text-ink-muted",
  credit: "bg-credit-soft text-credit",
  debit: "bg-debit-soft text-debit",
  primary: "bg-primary-soft text-primary",
} as const;

export type BadgeTone = keyof typeof badgeTones;

/** A small label: "Refund", "Money in", "2 accounts". */
export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex h-6 items-center rounded-pill px-2.5 type-caption font-medium whitespace-nowrap",
        badgeTones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
