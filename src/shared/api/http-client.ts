/**
 * The only module that talks to the network (ESLint forbids `fetch` anywhere
 * else in src/). Feature API modules build on `HttpClient.request`, with request
 * and response types from ./types.
 *
 * With a `refresher`, a 401 on a protected call refreshes the tokens once
 * (shared by every request that fails at the same time, see ./token-refresh)
 * and retries the request once with the new token.
 */
import { NetworkError, apiErrorFromBody } from "./api-error";

import type { TokenRefresher } from "./token-refresh";

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
  /** Refreshes the access token after a 401 on a protected call. Without it, 401s are thrown as is. */
  refresher?: TokenRefresher;
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
  refresher,
  defaultTimeoutMs = DEFAULT_TIMEOUT_MS,
}: HttpClientConfig): HttpClient {
  /** One HTTP attempt with the given token (null: no Authorization header). */
  async function send(
    path: string,
    options: RequestOptions,
    token: string | null,
  ): Promise<{ response: Response; data: unknown }> {
    const { method = "GET", query, body, signal, timeoutMs = defaultTimeoutMs } = options;

    const headers = new Headers({ Accept: "application/json" });
    if (body !== undefined) headers.set("Content-Type", "application/json");
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

    return { response, data: await readBody(response) };
  }

  return {
    async request<T>(path: `/api/${string}`, options: RequestOptions = {}): Promise<T> {
      const auth = options.auth ?? true;
      const token = auth ? getAccessToken() : null;
      let { response, data } = await send(path, options, token);

      // Expired or missing access token on a protected call: refresh once and
      // retry once. Login, register and refresh use auth: false, so a wrong
      // password or a rejected refresh token never triggers a refresh.
      if (response.status === 401 && auth && refresher) {
        const freshToken = await refresher.refresh(token);
        if (freshToken === null) throw apiErrorFromBody(response.status, data);
        ({ response, data } = await send(path, options, freshToken));
      }

      if (!response.ok) throw apiErrorFromBody(response.status, data);
      // The API's contract (docs/api/openapi.json) is the source of T; callers that
      // need more certainty, such as auth and money, validate the shape themselves.
      return data as T;
    },
  };
}
