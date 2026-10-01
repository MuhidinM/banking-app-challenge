import { House, SearchX } from "lucide-react";
import Link from "next/link";

import { isNetworkError } from "@/shared/api/api-error";
import { describeError } from "@/shared/api/error-messages";
import { Button } from "@/shared/ui/button";
import { Card } from "@/shared/ui/card";
import { Skeleton, ListRowSkeleton, LoadingRegion } from "@/shared/ui/skeleton";
import { EmptyState, ErrorState } from "@/shared/ui/states";

/**
 * Route-level fallbacks (loading.tsx, error.tsx, not-found.tsx), built from the
 * component sheet's own states (spec note N-020: the spec draws none of them).
 */

/** While a page's code and data load: a header line and a card of rows. */
export function RouteLoading() {
  return (
    <LoadingRegion label="Loading the page" className="flex flex-col gap-section">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-7 w-48" />
        <Skeleton className="h-4 w-64 max-w-full" />
      </div>
      <Card className="overflow-hidden">
        <ListRowSkeleton />
        <ListRowSkeleton />
        <ListRowSkeleton />
      </Card>
    </LoadingRegion>
  );
}

/**
 * A page that failed to render. The copy comes from describeError, so a lost
 * connection says so and nothing from the server is shown (R-UX-07).
 */
export function RouteError({ error, onRetry }: { error: unknown; onRetry: () => void }) {
  const { message } = describeError(error, "load");
  return (
    <Card>
      <ErrorState
        title="This page couldn't load"
        description={message}
        kind={isNetworkError(error) ? "offline" : "error"}
        onRetry={onRetry}
      />
    </Card>
  );
}

/** A URL that matches no page, or an item that doesn't exist (notFound()). */
export function RouteNotFound() {
  return (
    <Card>
      <EmptyState
        icon={SearchX}
        title="Page not found"
        description="The page you're looking for doesn't exist or has moved."
        action={
          <Button asChild icon={House} size="compact">
            <Link href="/">Go to home</Link>
          </Button>
        }
      />
    </Card>
  );
}
