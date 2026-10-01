import { vi } from "vitest";

import type { SessionEnvironment } from "@/features/auth/session-store";

/**
 * A localStorage stand-in we can inspect, plus a spy for the has_session cookie,
 * for session tests. Reuse one environment across two stores to simulate a reload.
 */
export function fakeSessionEnvironment(initial: Record<string, string> = {}) {
  const values = new Map(Object.entries(initial));
  const cookie = vi.fn<(present: boolean) => void>();
  const environment: SessionEnvironment = {
    storage: {
      getItem: (key) => values.get(key) ?? null,
      setItem: (key, value) => void values.set(key, value),
      removeItem: (key) => void values.delete(key),
    },
    setSessionCookie: cookie,
  };
  return { environment, values, cookie };
}
