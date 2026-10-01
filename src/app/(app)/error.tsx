"use client";

import { useEffect } from "react";

import { RouteError } from "@/shared/layout/route-states";

/** A signed-in page failed to render: the shell stays, the page offers a retry. */
export default function AppError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[page] failed to render", error);
  }, [error]);

  return <RouteError error={error} onRetry={retry} />;
}
