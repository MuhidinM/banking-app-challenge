import { describe, expect, it } from "vitest";

import { ApiError, NetworkError } from "./api-error";
import { getQueryClient } from "./query-client";

const retry = getQueryClient().getDefaultOptions().queries?.retry as (
  failureCount: number,
  error: unknown,
) => boolean;

describe("query client", () => {
  it("is one cache per tab", () => {
    expect(getQueryClient()).toBe(getQueryClient());
  });

  it("retries a network failure or a server error, at most twice", () => {
    expect(retry(0, new NetworkError("offline"))).toBe(true);
    expect(retry(1, new ApiError({ status: 503, code: "UNKNOWN" }))).toBe(true);
    expect(retry(2, new NetworkError("timeout"))).toBe(false);
  });

  it("doesn't retry what can't change: 4xx answers and bugs", () => {
    expect(retry(0, new ApiError({ status: 404, code: "ACC_001" }))).toBe(false);
    expect(retry(0, new ApiError({ status: 401, code: "AUTH_005" }))).toBe(false);
    expect(retry(0, new TypeError("x is undefined"))).toBe(false);
  });

  it("never retries a mutation: a retried transfer could send money twice", () => {
    expect(getQueryClient().getDefaultOptions().mutations?.retry).toBe(false);
  });
});
