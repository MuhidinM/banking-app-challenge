import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { expireAccessTokens, expireRefreshTokens } from "@/mocks/tokens";
import { ApiError, NetworkError } from "@/shared/api/api-error";
import { createHttpClient } from "@/shared/api/http-client";
import { type TokenPair, type TokenStore, createTokenRefresher } from "@/shared/api/token-refresh";
import type { Account, Page, User } from "@/shared/api/types";
import { env } from "@/shared/config/env";

import { createAuthApi } from "./api";

// The client, auth API and refresher wired together the way the app will be,
// against the mock API, which rotates refresh tokens and rejects reused ones
// like the real API does.

function setup() {
  let pair: Partial<TokenPair> = {};
  const tokens: TokenStore = {
    getAccessToken: () => pair.accessToken ?? null,
    getRefreshToken: () => pair.refreshToken ?? null,
    setTokens: (next) => {
      // Keep only the two tokens, never the rest of a login response.
      pair = { accessToken: next.accessToken, refreshToken: next.refreshToken };
    },
    clear: () => {
      pair = {};
    },
  };
  const onSessionExpired = vi.fn();

  // The refresher calls the auth API, which uses the same client: the refresh
  // request is sent with auth: false, so it can never trigger another refresh.
  const auth = { api: null as ReturnType<typeof createAuthApi> | null };
  const client = createHttpClient({
    baseUrl: env.apiBaseUrl,
    getAccessToken: tokens.getAccessToken,
    refresher: createTokenRefresher({
      tokens,
      requestRefresh: (refreshToken) => auth.api!.refreshTokens(refreshToken),
      onSessionExpired,
    }),
  });
  auth.api = createAuthApi(client);

  return {
    client,
    authApi: auth.api,
    tokens,
    onSessionExpired,
    current: () => pair,
    /** What a page reload leaves: the refresh token in storage, no access token in memory (#18). */
    dropAccessToken: () => {
      pair = { refreshToken: pair.refreshToken };
    },
  };
}

/** Counts refresh-token requests and records the Authorization header of every other request. */
function watchRequests() {
  const seen = { refreshes: 0, authorizations: [] as (string | null)[] };
  server.events.on("request:start", ({ request }) => {
    if (new URL(request.url).pathname === "/api/auth/refresh-token") seen.refreshes += 1;
    else seen.authorizations.push(request.headers.get("Authorization"));
  });
  return seen;
}

async function signIn(app: ReturnType<typeof setup>) {
  const session = await app.authApi.login({ username: "demo.jane", passwordHash: DEMO_PASSWORD });
  app.tokens.setTokens(session);
  return session;
}

afterEach(() => {
  server.events.removeAllListeners();
});

describe("token refresh against the mock API", () => {
  it("five concurrent 401s cause exactly one refresh, and all five succeed", async () => {
    const app = setup();
    await signIn(app);
    expireAccessTokens();
    const seen = watchRequests();

    const results = await Promise.all(
      Array.from({ length: 5 }, () => app.client.request<User>("/api/users/me")),
    );

    expect(results.map((user) => user.username)).toEqual(Array(5).fill("demo.jane"));
    expect(seen.refreshes).toBe(1);
  });

  it("retries with the new token, and stores both rotated tokens", async () => {
    const app = setup();
    const first = await signIn(app);
    expireAccessTokens();
    const seen = watchRequests();

    await app.client.request<Page<Account>>("/api/accounts");

    const { accessToken, refreshToken } = app.current();
    expect(accessToken).not.toBe(first.accessToken);
    expect(refreshToken).not.toBe(first.refreshToken);
    expect(seen.authorizations).toEqual([`Bearer ${first.accessToken}`, `Bearer ${accessToken}`]);
  });

  it("retries only once, even if the retry gets a 401 too", async () => {
    const app = setup();
    await signIn(app);
    server.use(
      http.get(apiUrl("/api/users/me"), () =>
        HttpResponse.json(
          { status: 401, code: "AUTH_005", message: "nope", path: "/api/users/me" },
          { status: 401 },
        ),
      ),
    );
    const seen = watchRequests();

    await expect(app.client.request("/api/users/me")).rejects.toMatchObject({ status: 401 });
    expect(seen.authorizations).toHaveLength(2); // the original and one retry
    expect(seen.refreshes).toBe(1);
  });

  it("never refreshes after a 401 from login", async () => {
    const app = setup();
    const seen = watchRequests();
    await expect(
      app.authApi.login({ username: "demo.jane", passwordHash: "wrong" }),
    ).rejects.toMatchObject({ code: "AUTH_001" });
    expect(seen.refreshes).toBe(0);
    expect(app.onSessionExpired).not.toHaveBeenCalled();
  });

  it("ends the session cleanly when the refresh token has expired too", async () => {
    const app = setup();
    await signIn(app);
    expireAccessTokens();
    expireRefreshTokens();
    const seen = watchRequests();

    const errors = await Promise.all(
      Array.from({ length: 3 }, () =>
        app.client.request("/api/users/me").catch((error: unknown) => error),
      ),
    );

    errors.forEach((error) => expect(error).toBeInstanceOf(ApiError));
    expect(seen.refreshes).toBe(1);
    expect(app.current()).toEqual({});
    expect(app.onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the refresh can't reach the API", async () => {
    const app = setup();
    const session = await signIn(app);
    expireAccessTokens();
    server.use(http.post(apiUrl("/api/auth/refresh-token"), () => HttpResponse.error()));

    await expect(app.client.request("/api/users/me")).rejects.toBeInstanceOf(NetworkError);
    expect(app.current()).toEqual({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    expect(app.onSessionExpired).not.toHaveBeenCalled();
  });

  it("restores a session from only the refresh token, as after a page reload", async () => {
    const app = setup();
    const session = await signIn(app);
    app.dropAccessToken();
    const seen = watchRequests();

    const me = await app.client.request<User>("/api/users/me");
    expect(me.username).toBe("demo.jane");
    expect(seen.authorizations[0]).toBeNull(); // first try had no token, got a 401
    expect(seen.refreshes).toBe(1);
    expect(app.current().refreshToken).not.toBe(session.refreshToken);
  });
});
