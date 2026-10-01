import { type ApiErrorCode, isApiErrorCode } from "./error-codes";

/**
 * The API answered with an error (any non-2xx status). `code` is the API's
 * application code (ACC_002, AUTH_003…) when it sent one; user-facing copy is
 * derived from it (#19). `serverMessage` is kept for logs only and must never
 * be shown: the brief requires friendly messages, never raw backend text.
 */
export class ApiError extends Error {
  override readonly name = "ApiError";
  readonly status: number;
  /** "UNKNOWN" when the body wasn't an API ErrorResponse (e.g. a proxy's HTML 502 page). */
  readonly code: ApiErrorCode | "UNKNOWN";
  readonly path: string | undefined;
  readonly serverMessage: string | undefined;

  constructor(init: {
    status: number;
    code: ApiErrorCode | "UNKNOWN";
    path?: string | undefined;
    serverMessage?: string | undefined;
  }) {
    super(`API request failed: ${init.status} ${init.code}`);
    this.status = init.status;
    this.code = init.code;
    this.path = init.path;
    this.serverMessage = init.serverMessage;
  }
}

export type NetworkErrorReason =
  /** The browser reports no connection. */
  | "offline"
  /** No answer within the timeout. */
  | "timeout"
  /** The request never got a response: DNS failure, refused connection, CORS. */
  | "unreachable";

/** The request didn't get an HTTP response at all. */
export class NetworkError extends Error {
  override readonly name = "NetworkError";
  readonly reason: NetworkErrorReason;

  constructor(reason: NetworkErrorReason, options?: { cause?: unknown }) {
    super(`Network request failed: ${reason}`, options);
    this.reason = reason;
  }
}

export function isApiError(error: unknown, code?: ApiErrorCode): error is ApiError {
  return error instanceof ApiError && (code === undefined || error.code === code);
}

export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/** Reads the API's ErrorResponse body defensively; anything unexpected becomes UNKNOWN. */
export function apiErrorFromBody(status: number, body: unknown): ApiError {
  const fields = typeof body === "object" && body !== null ? (body as Record<string, unknown>) : {};
  return new ApiError({
    status,
    code: isApiErrorCode(fields.code) ? fields.code : "UNKNOWN",
    path: typeof fields.path === "string" ? fields.path : undefined,
    serverMessage: typeof fields.message === "string" ? fields.message : undefined,
  });
}
