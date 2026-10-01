/**
 * The only module that talks to the network (ESLint forbids `fetch` anywhere
 * else in src/). Feature API modules build on `HttpClient.request`, with request
 * and response types from ./types.
 *
 * Token refresh on 401 (single-flight, one retry) is layered on in #17; this
 * file only attaches the current access token.
 */
import { NetworkError, apiErrorFromBody } from "./api-error";

export type QueryValue = string | number | boolean | undefined | readonly (string | number)[];

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  /** Query parameters. Arrays repeat the key, as the API expects for `sort`. Undefined values are skipped. */
  query?: Record<string, QueryValue>;
  /** Sent as JSON. */
  body?: unknown;
  /** Send `Authorization: Bearer <access token>`. Default true; false for login, register and refresh. */
  auth?: boolean;
  /** Cancels the request, e.g. TanStack Query's signal when a query is no longer needed. */
  signal?: AbortSignal | undefined;
  /** Give up after this long and throw NetworkError("timeout"). Default 15 s. */
  timeoutMs?: number;
}

export interface HttpClientConfig {
  /** API origin without a trailing slash (env.apiBaseUrl). */
  baseUrl: string;
  /** The current access token, or null when signed out. Read for every request. */
  getAccessToken: () => string | null;
  defaultTimeoutMs?: number;
}

export interface HttpClient {
  request<T>(path: `/api/${string}`, options?: RequestOptions): Promise<T>;
}

export const DEFAULT_TIMEOUT_MS = 15_000;

export function buildUrl(
  baseUrl: string,
  path: string,
  query?: Record<string, QueryValue>,
): string {
  const url = new URL(`${baseUrl}${path}`);
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value === undefined) continue;
    for (const item of Array.isArray(value) ? value : [value]) {
      url.searchParams.append(key, String(item));
    }
  }
  return url.toString();
}

/** The response body as JSON, or undefined when there is none (e.g. 204) or it isn't JSON. */
async function readBody(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return undefined;
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Matches by name, not instanceof DOMException: fetch and the page can come from
 * different realms (Node vs jsdom in tests, a polyfill in old browsers), each with
 * its own DOMException class.
 */
function hasErrorName(error: unknown, name: string): boolean {
  return typeof error === "object" && error !== null && "name" in error && error.name === name;
}

export function createHttpClient({
  baseUrl,
  getAccessToken,
  defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
}: HttpClientConfig): HttpClient {
  return {
    async request<T>(path: `/api/${string}`, options: RequestOptions = {}): Promise<T> {
      const {
        method = "GET",
        query,
        body,
        auth = true,
        signal,
        timeoutMs = defaultTimeoutMs,
      } = options;

      const headers = new Headers({ Accept: "application/json" });
      if (body !== undefined) headers.set("Content-Type", "application/json");
      const token = auth ? getAccessToken() : null;
      if (token) headers.set("Authorization", `Bearer ${token}`);

      // The caller's signal cancels; the timeout signal fails with TimeoutError.
      const timeout = AbortSignal.timeout(timeoutMs);
      const combined = signal ? AbortSignal.any([signal, timeout]) : timeout;

      let response: Response;
      try {
        response = await fetch(buildUrl(baseUrl, path, query), {
          method,
          headers,
          body: body === undefined ? undefined : JSON.stringify(body),
          signal: combined,
        });
      } catch (error) {
        // A cancellation by the caller isn't a failure: rethrow it untouched so
        // TanStack Query treats it as cancelled rather than as an error.
        if (signal?.aborted) throw error;
        if (timeout.aborted || hasErrorName(error, "TimeoutError")) {
          throw new NetworkError("timeout", { cause: error });
        }
        const offline = typeof navigator !== "undefined" && navigator.onLine === false;
        throw new NetworkError(offline ? "offline" : "unreachable", { cause: error });
      }

      const data = await readBody(response);
      if (!response.ok) throw apiErrorFromBody(response.status, data);
      // The API's contract (docs/api/openapi.json) is the source of T; callers that
      // need more certainty, such as auth and money, validate the shape themselves.
      return data as T;
    },
  };
}
