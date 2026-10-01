"use client";

import { useEffect } from "react";

import { RouteError } from "@/shared/layout/route-states";
import { fontVariables } from "@/shared/theme/fonts";
import { themeInitScript } from "@/shared/theme/theme-preference";
import { Logo } from "@/shared/ui/logo";

import "./globals.css";

/**
 * The root layout itself failed. This replaces the whole document, so it
 * brings its own <html>, styles, fonts and theme script (Next.js: global-error
 * doesn't get the root layout).
 */
export default function GlobalError({
  error,
  retry,
}: {
  error: Error & { digest?: string };
  retry: () => void;
}) {
  useEffect(() => {
    console.error("[app] failed to render", error);
  }, [error]);

  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <title>Something went wrong · Kifiya Banking</title>
        {/* Same constant script as the root layout, so the error page uses the chosen theme. */}
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body>
        <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface-muted p-page">
          <Logo className="h-9 text-primary" />
          <div className="w-full max-w-md">
            <RouteError error={error} onRetry={retry} />
          </div>
        </main>
      </body>
    </html>
  );
}
