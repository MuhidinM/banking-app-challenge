import { ChevronRight, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import type { ComponentProps, ReactNode } from "react";

// Component sheet "Rows": tinted discs carry meaning. Accounts use the primary
// tint, money in the green tint, money out stays neutral.
const discTones = {
  primary: "bg-primary-soft text-primary",
  credit: "bg-credit-soft text-credit",
  neutral: "bg-surface-muted text-ink",
} as const;

export type DiscTone = keyof typeof discTones;

/** The 44px icon disc used in rows. */
export function IconDisc({
  icon: Icon,
  tone = "neutral",
  className,
}: {
  icon: LucideIcon;
  tone?: DiscTone;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-disc shrink-0 items-center justify-center rounded-pill",
        discTones[tone],
        className,
      )}
    >
      <Icon aria-hidden="true" className="size-icon" strokeWidth={1.75} />
    </span>
  );
}

/**
 * A list with dividers between rows. Put it in `<Card className="overflow-hidden">`
 * so a row's hover background follows the card's rounded corners.
 */
export function RowList({ className, ...props }: ComponentProps<"ul">) {
  return <ul className={cn("divide-y divide-border", className)} {...props} />;
}

interface ListRowProps {
  icon: LucideIcon;
  tone?: DiscTone;
  title: ReactNode;
  /** Second line, e.g. "•••• 8057" or "Refund · 15:18". */
  meta?: ReactNode;
  /** Right side, e.g. "ETB 8,640.00" or "+ETB 1,665.00". */
  value?: ReactNode;
  /** Under the value, e.g. "Available". */
  valueMeta?: ReactNode;
  /** Classes for the value, e.g. "text-credit" for money in. */
  valueClassName?: string;
  /** Makes the row a link (with a chevron), e.g. to the account. */
  href?: string;
  /** Makes the row a button, e.g. to open transaction details. */
  onClick?: () => void;
  /**
   * What screen readers read instead of the visible pieces, as one sentence,
   * e.g. "Refund from merchant, money in, ETB 1,665.00, refund, today at 15:18."
   */
  label?: string;
  className?: string;
}

/**
 * One row of a list (UI spec: min height 72, padding 14px 20px, 44px disc).
 * The whole row is the link or button, so the tap target is the full row.
 */
export function ListRow({
  icon,
  tone,
  title,
  meta,
  value,
  valueMeta,
  valueClassName,
  href,
  onClick,
  label,
  className,
}: ListRowProps) {
  const visible = (
    <>
      <IconDisc icon={icon} tone={tone} />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate type-body-strong text-ink">{title}</span>
        {meta && <span className="truncate type-caption text-ink-muted">{meta}</span>}
      </span>
      {(value || valueMeta) && (
        <span className="flex shrink-0 flex-col items-end">
          {value && (
            <span className={cn("type-body-strong amount text-ink", valueClassName)}>{value}</span>
          )}
          {valueMeta && <span className="type-caption text-ink-muted">{valueMeta}</span>}
        </span>
      )}
      {href && (
        <ChevronRight
          aria-hidden="true"
          className="size-icon shrink-0 text-ink-muted"
          strokeWidth={1.75}
        />
      )}
    </>
  );
  const content = label ? (
    <>
      <span className="sr-only">{label}</span>
      <span aria-hidden="true" className="contents">
        {visible}
      </span>
    </>
  ) : (
    visible
  );

  const rowClasses = cn(
    "flex min-h-row w-full items-center gap-3.5 px-row-x py-row-y text-left",
    (href || onClick) && "transition-colors hover:bg-surface-muted focus-visible:-outline-offset-2",
    className,
  );

  return (
    <li>
      {href ? (
        <Link href={href} className={rowClasses}>
          {content}
        </Link>
      ) : onClick ? (
        <button type="button" onClick={onClick} className={rowClasses}>
          {content}
        </button>
      ) : (
        <div className={rowClasses}>{content}</div>
      )}
    </li>
  );
}
