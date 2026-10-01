import { QueryClient, isServer } from "@tanstack/react-query";

import { isApiError, isNetworkError } from "./api-error";

/** Retry only what a moment later could fix: no connection, or the server's own failure. */
function shouldRetry(failureCount: number, error: unknown): boolean {
  if (failureCount >= 2) return false;
  return isNetworkError(error) || (isApiError(error) && error.status >= 500);
}

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { staleTime: 30_000, retry: shouldRetry },
      // A retried transfer could send the money twice.
      mutations: { retry: false },
    },
  });
}

let browserClient: QueryClient | undefined;

/**
 * The app's query cache (ADR-0004). One per browser tab, so logout can clear
 * it from outside React (features/auth/session.ts). On the server, a new one
 * per call: client components still render there, and a shared cache would
 * mix users' data (TanStack Query's Next.js guide).
 */
export function getQueryClient(): QueryClient {
  if (isServer) return makeQueryClient();
  browserClient ??= makeQueryClient();
  return browserClient;
}
