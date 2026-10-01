import { describe, expect, it } from "vitest";

import { ApiError, NetworkError, apiErrorFromBody, isApiError, isNetworkError } from "./api-error";

describe("apiErrorFromBody", () => {
  it("reads the API's ErrorResponse", () => {
    const error = apiErrorFromBody(400, {
      timestamp: "2025-06-01T10:30:00.123456",
      status: 400,
      error: "Bad Request",
      code: "ACC_002",
      message: "Insufficient balance in account 1000000001.",
      path: "/api/accounts/transfer",
    });
    expect(error).toMatchObject({
      status: 400,
      code: "ACC_002",
      path: "/api/accounts/transfer",
      serverMessage: "Insufficient balance in account 1000000001.",
    });
  });

  it.each([
    ["no body", undefined],
    ["null", null],
    ["a string", "Internal Server Error"],
    ["an unknown code", { code: "ACC_999", message: "?" }],
    ["a missing code", { message: "Something broke" }],
  ])("falls back to UNKNOWN for %s", (_case, body) => {
    const error = apiErrorFromBody(500, body);
    expect(error.code).toBe("UNKNOWN");
    expect(error.status).toBe(500);
  });

  it("never puts the server's text in the error message", () => {
    const error = apiErrorFromBody(400, {
      code: "VAL_001",
      message: "username: must not be blank",
    });
    expect(error.message).toBe("API request failed: 400 VAL_001");
  });
});

describe("type guards", () => {
  it("tell API errors, network errors and other errors apart", () => {
    const apiError = new ApiError({ status: 404, code: "ACC_001" });
    const networkError = new NetworkError("timeout");

    expect(isApiError(apiError)).toBe(true);
    expect(isApiError(apiError, "ACC_001")).toBe(true);
    expect(isApiError(apiError, "ACC_004")).toBe(false);
    expect(isApiError(networkError)).toBe(false);
    expect(isNetworkError(networkError)).toBe(true);
    expect(isNetworkError(new Error("other"))).toBe(false);
    expect(apiError.name).toBe("ApiError");
    expect(networkError.name).toBe("NetworkError");
  });
});
