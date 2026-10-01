"use client";

import { useCallback, useState } from "react";

const STORAGE_KEY = "kb-hide-balance";

function readHidden(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

/**
 * Whether the total balance is hidden (the eye button on the balance card).
 * Remembered on this device, so someone who hides it in public doesn't have
 * to every time. Rendered only after sign-in, in the browser (RequireSession),
 * so reading storage while rendering can't cause a hydration mismatch.
 */
export function useHiddenBalance() {
  const [hidden, setHidden] = useState(readHidden);
  const toggle = useCallback(() => {
    setHidden((current) => {
      const next = !current;
      try {
        if (next) localStorage.setItem(STORAGE_KEY, "1");
        else localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Not remembered; the toggle still works for this visit.
      }
      return next;
    });
  }, []);
  return { hidden, toggle };
}
