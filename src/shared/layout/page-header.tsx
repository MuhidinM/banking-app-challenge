import { ChevronLeft } from "lucide-react";
import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  /** One line under the title, e.g. "Send money to any Kifiya Bank account." */
  description?: ReactNode;
  /** A back button to this page, e.g. the account for its activity. */
  back?: { href: string; label: string };
  /** Buttons on the right (web) or under the title (mobile), e.g. Transfer · Pay bill. */
  actions?: ReactNode;
  className?: string;
}

/**
 * A page's heading (UI spec, WebTransfer and mobile Transfer): optional back
 * button (46 px disc), the title (24 px; 22 on phones beside a back button), a description
 * and actions. The <h1> takes focus after a client-side navigation
 * (RouteFocus), so keyboard and screen reader users start on the new page.
 */
export function PageHeader({ title, description, back, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-start md:justify-between",
        // The spec's page padding is 48 px on top, not 56, on phones with a back button.
        back && "max-md:-mt-2",
        className,
      )}
    >
      <div className="flex min-w-0 items-start gap-3">
        {back ? (
          <Link
            href={back.href}
            aria-label={back.label}
            className="flex size-[2.875rem] shrink-0 items-center justify-center rounded-pill border border-border bg-surface text-ink hover:bg-surface-muted"
          >
            <ChevronLeft aria-hidden="true" className="size-icon" strokeWidth={1.75} />
          </Link>
        ) : null}
        <div className="flex min-w-0 flex-col gap-1">
          <h1
            tabIndex={-1}
            data-page-heading=""
            className={cn(
              "type-title text-ink outline-none",
              // Beside a back button the phone title is 22 px (mobile Transfer);
              // top-level pages keep 24 (mobile Accounts).
              back && "flex min-h-[2.875rem] items-center max-md:text-[1.375rem]",
            )}
          >
            {title}
          </h1>
          {description ? <p className="type-body text-ink-muted">{description}</p> : null}
        </div>
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-3">{actions}</div> : null}
    </header>
  );
}
