import { cn } from "@/shared/lib/cn";

import type { ReactNode } from "react";

/**
 * A placeholder block shown while content loads. Pulses only when the user
 * hasn't asked for reduced motion. Hidden from screen readers: the surrounding
 * `LoadingRegion` announces what is loading instead.
 */
export function Skeleton({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cn("block rounded-control bg-border/70 motion-safe:animate-pulse", className)}
    />
  );
}

/** Same size and layout as a ListRow, so the list doesn't jump when data arrives. */
export function ListRowSkeleton({ withValue = true }: { withValue?: boolean }) {
  return (
    <li aria-hidden="true" className="flex min-h-row items-center gap-3.5 px-row-x py-row-y">
      <Skeleton className="size-disc shrink-0 rounded-pill" />
      <span className="flex flex-1 flex-col gap-2">
        <Skeleton className="h-3.5 w-2/5" />
        <Skeleton className="h-3 w-1/4" />
      </span>
      {withValue && (
        <span className="flex flex-col items-end gap-2">
          <Skeleton className="h-3.5 w-24" />
          <Skeleton className="h-3 w-14" />
        </span>
      )}
    </li>
  );
}

interface LoadingRegionProps {
  /** Read out to screen readers, e.g. "Loading your accounts". */
  label: string;
  className?: string;
  children: ReactNode;
}

/**
 * Wraps skeletons: tells assistive technology that something is loading
 * (role="status", aria-busy) while the skeletons themselves stay silent.
 */
export function LoadingRegion({ label, className, children }: LoadingRegionProps) {
  return (
    <div role="status" aria-busy="true" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
