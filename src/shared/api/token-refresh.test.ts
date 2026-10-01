import { describe, expect, it, vi } from "vitest";

import { ApiError, NetworkError } from "./api-error";
import { type TokenPair, type TokenStore, createTokenRefresher } from "./token-refresh";

function memoryStore(initial: Partial<TokenPair> = {}): TokenStore & { pair: Partial<TokenPair> } {
  const store = {
    pair: { ...initial },
    getAccessToken: () => store.pair.accessToken ?? null,
    getRefreshToken: () => store.pair.refreshToken ?? null,
    setTokens: (pair: TokenPair) => {
      store.pair = { ...pair };
    },
    clear: () => {
      store.pair = {};
    },
  };
  return store;
}

/** A refresh call that stays pending until the test settles it. */
function deferredRefresh() {
  let settle!: { resolve: (pair: TokenPair) => void; reject: (error: unknown) => void };
  const requestRefresh = vi.fn(
    () =>
      new Promise<TokenPair>((resolve, reject) => {
        settle = { resolve, reject };
      }),
  );
  return { requestRefresh, settle: () => settle };
}

describe("createTokenRefresher", () => {
  it("shares one refresh between every request that fails at the same time", async () => {
    const tokens = memoryStore({ accessToken: "old-access", refreshToken: "refresh-1" });
    const { requestRefresh, settle } = deferredRefresh();
    const refresher = createTokenRefresher({ tokens, requestRefresh, onSessionExpired: vi.fn() });

    const results = Promise.all(Array.from({ length: 5 }, () => refresher.refresh("old-access")));
    settle().resolve({ accessToken: "new-access", refreshToken: "refresh-2" });

    expect(await results).toEqual(Array(5).fill("new-access"));
    expect(requestRefresh).toHaveBeenCalledTimes(1);
    expect(requestRefresh).toHaveBeenCalledWith("refresh-1");
  });

  it("replaces both tokens, because they rotate", async () => {
    const tokens = memoryStore({ accessToken: "old-access", refreshToken: "refresh-1" });
    const refresher = createTokenRefresher({
      tokens,
      requestRefresh: async () => ({ accessToken: "new-access", refreshToken: "refresh-2" }),
      onSessionExpired: vi.fn(),
    });
    await refresher.refresh("old-access");
    expect(tokens.pair).toEqual({ accessToken: "new-access", refreshToken: "refresh-2" });
  });

  it("doesn't refresh again for a request that failed with a token that was already replaced", async () => {
    const tokens = memoryStore({ accessToken: "new-access", refreshToken: "refresh-2" });
    const requestRefresh = vi.fn();
    const refresher = createTokenRefresher({ tokens, requestRefresh, onSessionExpired: vi.fn() });

    // A slow request sent with the old token gets its 401 after the refresh finished.
    await expect(refresher.refresh("old-access")).resolves.toBe("new-access");
    expect(requestRefresh).not.toHaveBeenCalled();
  });

  it("refreshes again later, once the previous refresh has finished", async () => {
    const tokens = memoryStore({ accessToken: "a1", refreshToken: "r1" });
    let n = 1;
    const requestRefresh = vi.fn(async () => {
      n += 1;
      return { accessToken: `a${n}`, refreshToken: `r${n}` };
    });
    const refresher = createTokenRefresher({ tokens, requestRefresh, onSessionExpired: vi.fn() });

    await refresher.refresh("a1");
    await refresher.refresh("a2"); // ten minutes later, the new token expired too
    expect(requestRefresh).toHaveBeenCalledTimes(2);
    expect(requestRefresh).toHaveBeenLastCalledWith("r2");
  });

  it("ends the session once when the refresh token is rejected", async () => {
    const tokens = memoryStore({ accessToken: "old-access", refreshToken: "expired" });
    const onSessionExpired = vi.fn();
    const { requestRefresh, settle } = deferredRefresh();
    const refresher = createTokenRefresher({ tokens, requestRefresh, onSessionExpired });

    const results = Promise.all(Array.from({ length: 5 }, () => refresher.refresh("old-access")));
    settle().reject(new ApiError({ status: 401, code: "AUTH_005" }));

    expect(await results).toEqual(Array(5).fill(null));
    expect(tokens.pair).toEqual({});
    expect(onSessionExpired).toHaveBeenCalledTimes(1);

    // A request still in flight when the session ended doesn't report it again.
    await expect(refresher.refresh("old-access")).resolves.toBeNull();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("ends the session when there is no refresh token to use", async () => {
    const tokens = memoryStore({});
    const onSessionExpired = vi.fn();
    const requestRefresh = vi.fn();
    const refresher = createTokenRefresher({ tokens, requestRefresh, onSessionExpired });

    await expect(refresher.refresh(null)).resolves.toBeNull();
    expect(requestRefresh).not.toHaveBeenCalled();
    expect(onSessionExpired).toHaveBeenCalledTimes(1);
  });

  it("keeps the session when the refresh couldn't reach the API", async () => {
    const tokens = memoryStore({ accessToken: "old-access", refreshToken: "refresh-1" });
    const onSessionExpired = vi.fn();
    const refresher = createTokenRefresher({
      tokens,
      requestRefresh: async () => {
        throw new NetworkError("offline");
      },
      onSessionExpired,
    });

    await expect(refresher.refresh("old-access")).rejects.toBeInstanceOf(NetworkError);
    expect(tokens.pair).toEqual({ accessToken: "old-access", refreshToken: "refresh-1" });
    expect(onSessionExpired).not.toHaveBeenCalled();
  });

  it("runs the refresh through runExclusive, for the cross-tab lock (#24)", async () => {
    const tokens = memoryStore({ accessToken: "old-access", refreshToken: "refresh-1" });
    let exclusiveRuns = 0;
    const runExclusive = <T>(task: () => Promise<T>) => {
      exclusiveRuns += 1;
      return task();
    };
    const refresher = createTokenRefresher({
      tokens,
      requestRefresh: async () => ({ accessToken: "new-access", refreshToken: "refresh-2" }),
      onSessionExpired: vi.fn(),
      runExclusive,
    });
    await Promise.all([refresher.refresh("old-access"), refresher.refresh("old-access")]);
    expect(exclusiveRuns).toBe(1);
  });
});
