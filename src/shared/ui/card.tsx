import Link from "next/link";

import { cn } from "@/shared/lib/cn";

import type { ComponentProps, ReactNode } from "react";

/** A surface for grouped content (UI spec: radius 16, 1px border, card shadow). */
export function Card({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn("rounded-card border border-border bg-surface shadow-card", className)}
      {...props}
    />
  );
}

interface SectionHeaderProps {
  title: ReactNode;
  /** e.g. "View all" linking to the full list. */
  action?: { label: string; href: string } | undefined;
  /** Heading level, so each page keeps a correct outline. */
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}

/** A section title with an optional link on the right ("My accounts · View all"). */
export function SectionHeader({
  title,
  action,
  as: Heading = "h2",
  id,
  className,
}: SectionHeaderProps) {
  return (
    <div className={cn("flex items-baseline justify-between gap-4", className)}>
      <Heading id={id} className="type-heading text-ink">
        {title}
      </Heading>
      {action && (
        <Link
          href={action.href}
          className="hit-area type-label text-primary underline-offset-4 hover:underline"
        >
          {action.label}
        </Link>
      )}
    </div>
  );
}
