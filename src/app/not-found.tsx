import { RouteNotFound } from "@/shared/layout/route-states";
import { Logo } from "@/shared/ui/logo";

import type { Metadata } from "next";

export const metadata: Metadata = { title: "Page not found" };

/** Any URL that matches no page. Outside the app shell, so it works signed in or out. */
export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-surface-muted p-page">
      <Logo className="h-9 text-primary" />
      <div className="w-full max-w-md">
        <RouteNotFound />
      </div>
    </main>
  );
}
