import { HttpResponse } from "msw";

import type { ApiErrorCode } from "@/shared/api/error-codes";
import type { ApiErrorBody, Page } from "@/shared/api/types";
import { env } from "@/shared/config/env";

import type { z } from "zod";

/** Full URL for an API path on the configured origin, e.g. `apiUrl("/api/accounts")`. */
export function apiUrl(path: `/api/${string}`): string {
  return `${env.apiBaseUrl}${path}`;
}

/** The API's timestamp format: ISO-8601 in UTC **without** an offset, e.g. `2025-06-01T10:30:00.123`. */
export function apiTimestamp(date: Date): string {
  return date.toISOString().slice(0, -1);
}

const reasonPhrases: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  500: "Internal Server Error",
};

/** An `ErrorResponse` exactly as the API sends it. */
export function apiError(
  status: number,
  code: ApiErrorCode,
  message: string,
  request: Request,
): HttpResponse<ApiErrorBody> {
  return HttpResponse.json(
    {
      timestamp: apiTimestamp(new Date()),
      status,
      error: reasonPhrases[status] ?? "Error",
      code,
      message,
      path: new URL(request.url).pathname,
    },
    { status },
  );
}

/** Thrown inside handlers to return an API error; see `respond`. */
export class MockApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ApiErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export const validationError = (message: string) => new MockApiError(400, "VAL_001", message);

/** Runs a handler body, turning a thrown `MockApiError` into an API error response. */
export async function respond(
  request: Request,
  body: () => Response | Promise<Response>,
): Promise<Response> {
  try {
    return await body();
  } catch (error) {
    if (error instanceof MockApiError) {
      return apiError(error.status, error.code, error.message, request);
    }
    console.error("[mock api] unexpected error", error);
    return apiError(500, "GEN_001", "Unexpected server error.", request);
  }
}

/** Reads the JSON body, or throws VAL_001 when it isn't JSON. */
export async function readJson(request: Request): Promise<unknown> {
  try {
    return await request.json();
  } catch {
    throw validationError("Request body must be valid JSON.");
  }
}

/** Validates a request body against a schema, or throws VAL_001 naming the invalid fields. */
export function parseBody<T>(schema: z.ZodType<T>, body: unknown): T {
  const result = schema.safeParse(body);
  if (!result.success) {
    const fields = result.error.issues.map((issue) => issue.path.join(".") || "body").join(", ");
    throw validationError(`Validation failed for: ${fields}.`);
  }
  return result.data;
}

function readIntParam(url: URL, name: string, fallback: number, min: number): number {
  const raw = url.searchParams.get(name);
  if (raw === null) return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min) {
    throw validationError(`Query parameter '${name}' must be an integer >= ${min}.`);
  }
  return value;
}

type SortableValue = string | number | Date;

/**
 * Sorts by `?sort=field,asc|desc` (Spring style), then slices one page.
 * `page` is 0-based and `size` defaults to 10, as in the real API.
 */
export function paginate<T>(
  items: readonly T[],
  url: URL,
  options: {
    defaultSort: string;
    sortFields: Record<string, (item: T) => SortableValue>;
  },
): Page<T> {
  const page = readIntParam(url, "page", 0, 0);
  const size = readIntParam(url, "size", 10, 1);

  const [field = "", direction = "asc"] = (url.searchParams.get("sort") ?? options.defaultSort)
    .split(",")
    .map((part) => part.trim());
  const key = options.sortFields[field];
  if (!key) throw validationError(`Cannot sort by '${field}'.`);
  const sign = direction.toLowerCase() === "desc" ? -1 : 1;

  const sorted = [...items].sort((a, b) => {
    const left = key(a);
    const right = key(b);
    return (left < right ? -1 : left > right ? 1 : 0) * sign;
  });

  const content = sorted.slice(page * size, page * size + size);
  const totalPages = Math.ceil(sorted.length / size);

  return {
    content,
    totalElements: sorted.length,
    totalPages,
    size,
    number: page,
    numberOfElements: content.length,
    first: page === 0,
    last: page >= totalPages - 1,
    empty: content.length === 0,
  };
}
