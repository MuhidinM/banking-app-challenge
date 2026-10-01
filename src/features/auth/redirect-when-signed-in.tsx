"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useSession } from "./use-session";

/**
 * On /login and /register: a user who turns out to be signed in (the session
 * was restored from storage) goes on to `to`. The route proxy handles the
 * usual case, with the `has_session` cookie, before the page renders.
 */
export function RedirectWhenSignedIn({ to }: { to: string }) {
  const router = useRouter();
  const { status } = useSession();

  useEffect(() => {
    if (status === "authenticated") router.replace(to);
  }, [status, to, router]);

  return null;
}
