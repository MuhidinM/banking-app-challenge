import { HttpResponse, delay, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { env } from "@/shared/config/env";

import { ApiError, NetworkError, isApiError, isNetworkError } from "./api-error";
import { buildUrl, createHttpClient } from "./http-client";

import type { LoginResponse, User } from "./types";

let token: string | null = null;
const client = createHttpClient({ baseUrl: env.apiBaseUrl, getAccessToken: () => token });

afterEach(() => {
  token = null;
});

/** Records the last request a handler saw, for header and body assertions. */
function captureRequests(path: `/api/${string}`) {
  const seen: Request[] = [];
  server.use(
    http.all(apiUrl(path), ({ request }) => {
      seen.push(request.clone());
      return HttpResponse.json({ ok: true });
    }),
  );
  return seen;
}

describe("buildUrl", () => {
  it("joins the base URL and path, repeats array values and skips undefined", () => {
    expect(
      buildUrl("https://api.test", "/api/transactions/1", {
        page: 0,
        size: 10,
        sort: ["timestamp,desc", "id,desc"],
        accountNumber: undefined,
      }),
    ).toBe(
      "https://api.test/api/transactions/1?page=0&size=10&sort=timestamp%2Cdesc&sort=id%2Cdesc",
    );
  });
});

describe("http client against the mock API", () => {
  it("logs in without a token and reads a protected resource with one", async () => {
    const session = await client.request<LoginResponse>("/api/auth/login", {
      method: "POST",
      auth: false,
      body: { username: "demo.jane", passwordHash: DEMO_PASSWORD },
    });
    expect(session.username).toBe("demo.jane");

    token = session.accessToken;
    const me = await client.request<User>("/api/users/me");
    expect(me).toMatchObject({ firstName: "Jane", lastName: "Doe" });
  });

  it("turns an API ErrorResponse into an ApiError with code and status", async () => {
    const error = await client
      .request("/api/auth/login", {
        method: "POST",
        auth: false,
        body: { username: "demo.jane", passwordHash: "wrong" },
      })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({ status: 401, code: "AUTH_001", path: "/api/auth/login" });
    expect(isApiError(error, "AUTH_001")).toBe(true);
    expect(isApiError(error, "ACC_002")).toBe(false);
  });

  it("keeps the server's message for logs but out of the error message", async () => {
    const error = (await client
      .request("/api/users/me")
      .catch((caught: unknown) => caught)) as ApiError;
    expect(error.code).toBe("AUTH_001");
    expect(error.serverMessage).toMatch(/authentication is required/i);
    expect(error.message).not.toContain(error.serverMessage);
  });
});

describe("requests", () => {
  it("sends the bearer token on protected calls only", async () => {
    const seen = captureRequests("/api/users/me");
    token = "access-token-1";
    await client.request("/api/users/me");
    await client.request("/api/users/me", { auth: false });
    token = null;
    await client.request("/api/users/me");

    expect(seen.map((request) => request.headers.get("Authorization"))).toEqual([
      "Bearer access-token-1",
      null,
      null,
    ]);
  });

  it("sends JSON bodies with a JSON content type, and no content type without a body", async () => {
    const seen = captureRequests("/api/accounts");
    await client.request("/api/accounts", {
      method: "POST",
      body: { accountType: "SAVINGS", initialBalance: 0 },
    });
    await client.request("/api/accounts");

    const [post, get] = seen;
    expect(post?.method).toBe("POST");
    expect(post?.headers.get("Content-Type")).toBe("application/json");
    expect(await post?.json()).toEqual({ accountType: "SAVINGS", initialBalance: 0 });
    expect(get?.headers.get("Content-Type")).toBeNull();
    expect(get?.headers.get("Accept")).toBe("application/json");
  });

  it("returns undefined for an empty response", async () => {
    server.use(http.get(apiUrl("/api/users/me"), () => new HttpResponse(null, { status: 204 })));
    await expect(client.request("/api/users/me")).resolves.toBeUndefined();
  });
});

describe("failures", () => {
  it("marks an error body that isn't an API ErrorResponse as UNKNOWN", async () => {
    server.use(
      http.get(
        apiUrl("/api/users/me"),
        () => new HttpResponse("<html>Bad gateway</html>", { status: 502 }),
      ),
    );
    await expect(client.request("/api/users/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 502,
      code: "UNKNOWN",
    });
  });

  it("reports a request that got no response as unreachable", async () => {
    server.use(http.get(apiUrl("/api/users/me"), () => HttpResponse.error()));
    const error = await client.request("/api/users/me").catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NetworkError);
    expect(error).toMatchObject({ reason: "unreachable" });
  });

  it("reports offline when the browser says it has no connection", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    server.use(http.get(apiUrl("/api/users/me"), () => HttpResponse.error()));
    await expect(client.request("/api/users/me")).rejects.toMatchObject({ reason: "offline" });
  });

  it("times out a slow request", async () => {
    server.use(
      http.get(apiUrl("/api/users/me"), async () => {
        await delay(500);
        return HttpResponse.json({});
      }),
    );
    const error = await client
      .request("/api/users/me", { timeoutMs: 50 })
      .catch((caught: unknown) => caught);
    expect(isNetworkError(error)).toBe(true);
    expect(error).toMatchObject({ reason: "timeout" });
  });

  it("lets a cancellation by the caller through as an AbortError, not a failure", async () => {
    server.use(
      http.get(apiUrl("/api/users/me"), async () => {
        await delay(500);
        return HttpResponse.json({});
      }),
    );
    const controller = new AbortController();
    const pending = client.request("/api/users/me", { signal: controller.signal });
    controller.abort();
    const error = await pending.catch((caught: unknown) => caught);
    expect(error).toMatchObject({ name: "AbortError" });
    expect(isNetworkError(error)).toBe(false);
  });
});
