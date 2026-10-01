"use client";

import { useEffect } from "react";

import { RouteError } from "@/shared/layout/route-states";
import { Logo } from "@/shared/ui/logo";

/** A page outside the app shell (sign-in, register) failed to render. */
export default function RootError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[page] failed to render", error);
  }, [error]);

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface-muted p-page">
      <Logo className="h-9 text-primary" />
      <div className="w-full max-w-md">
        <RouteError error={error} onRetry={retry} />
      </div>
    </main>
  );
}
