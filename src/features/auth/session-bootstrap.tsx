"use client";

import { useEffect } from "react";

import { getAppSession } from "./session";

/**
 * Restores a stored session when the app loads (one token refresh). Rendered
 * once in the root layout, inside MockApiProvider, so with mocking on the
 * request goes to the mock.
 */
export function SessionBootstrap() {
  useEffect(() => {
    getAppSession()
      .restore()
      .catch((error: unknown) => {
        // The session store already reflects the outcome; this is only for debugging.
        console.error("[session] restore failed", error);
      });
  }, []);

  return null;
}
