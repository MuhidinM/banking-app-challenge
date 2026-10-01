"use client";

import { LoaderCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ReactNode, useEffect } from "react";

import { LoadingRegion } from "@/shared/ui/skeleton";

import { loginPath } from "./routes";
import { useSession } from "./use-session";

/**
 * The real route guard (ADR-0002): renders protected pages only with a session.
 *
 * - Restoring after a reload ("unknown"): a quiet loading state, never the page.
 * - No session, or it ended: go to /login, with the way back. An expired
 *   session also gets `reason=expired` for the banner. This is how a rejected
 *   refresh token (onSessionExpired) reaches the login page.
 *
 * The route proxy usually redirects before this renders; this catches what the
 * cookie can't know, e.g. a refresh token that was removed or rejected.
 */
export function RequireSession({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { status, endedBecause } = useSession();

  useEffect(() => {
    if (status !== "anonymous") return;
    const here = `${window.location.pathname}${window.location.search}`;
    // Signing out returns to a plain login page, not to where the user was.
    const next = endedBecause === "signed-out" ? undefined : here;
    router.replace(loginPath({ next, expired: endedBecause === "expired" }));
  }, [status, endedBecause, router]);

  if (status === "authenticated") return children;
  return (
    <LoadingRegion label="Checking your session" className="grid min-h-dvh place-items-center">
      <LoaderCircle aria-hidden="true" className="size-6 animate-spin text-ink-subtle" />
    </LoadingRegion>
  );
}
