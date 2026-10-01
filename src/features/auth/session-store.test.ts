import { describe, expect, it, vi } from "vitest";

import { fakeSessionEnvironment as fakeEnvironment } from "@/test/fake-session-environment";

import { REFRESH_TOKEN_KEY, createSessionStore } from "./session-store";

const pair = { accessToken: "access-1", refreshToken: "refresh-1" };

describe("session store", () => {
  it("starts anonymous without a stored refresh token, and drops a stale session cookie", () => {
    const { environment, cookie } = fakeEnvironment();
    const store = createSessionStore(environment);
    expect(store.getSnapshot()).toEqual({ status: "anonymous", endedBecause: null });
    expect(store.getAccessToken()).toBeNull();
    expect(cookie).toHaveBeenCalledExactlyOnceWith(false);
  });

  it('starts "unknown" with a stored refresh token, until it is checked', () => {
    const { environment } = fakeEnvironment({ [REFRESH_TOKEN_KEY]: "refresh-1" });
    const store = createSessionStore(environment);
    expect(store.getSnapshot().status).toBe("unknown");
    expect(store.getRefreshToken()).toBe("refresh-1");
    expect(store.getAccessToken()).toBeNull();
  });

  it("keeps the access token in memory only and the refresh token in storage", () => {
    const { environment, values, cookie } = fakeEnvironment();
    const store = createSessionStore(environment);
    store.setTokens(pair);

    expect(store.getAccessToken()).toBe("access-1");
    expect(Object.fromEntries(values)).toEqual({ [REFRESH_TOKEN_KEY]: "refresh-1" });
    expect([...values.values()]).not.toContain("access-1");
    expect(cookie).toHaveBeenLastCalledWith(true);
    expect(store.getSnapshot()).toEqual({ status: "authenticated", endedBecause: null });
  });

  it("ends an expired session: tokens, storage and cookie cleared, reason recorded", () => {
    const { environment, values, cookie } = fakeEnvironment();
    const store = createSessionStore(environment);
    store.setTokens(pair);
    store.clear();

    expect(store.getAccessToken()).toBeNull();
    expect(store.getRefreshToken()).toBeNull();
    expect(values.size).toBe(0);
    expect(cookie).toHaveBeenLastCalledWith(false);
    expect(store.getSnapshot()).toEqual({ status: "anonymous", endedBecause: "expired" });
  });

  it("records a sign-out as such", () => {
    const store = createSessionStore(fakeEnvironment().environment);
    store.setTokens(pair);
    store.signOut();
    expect(store.getSnapshot()).toEqual({ status: "anonymous", endedBecause: "signed-out" });
  });

  it("can trust a stored session it couldn't check, but only while unknown", () => {
    const { environment } = fakeEnvironment({ [REFRESH_TOKEN_KEY]: "refresh-1" });
    const store = createSessionStore(environment);
    store.trustStoredSession();
    expect(store.getSnapshot().status).toBe("authenticated");

    store.signOut();
    store.trustStoredSession();
    expect(store.getSnapshot().status).toBe("anonymous");
  });

  it("works in memory when storage is unavailable (private mode)", () => {
    const store = createSessionStore({ storage: null, setSessionCookie: vi.fn() });
    store.setTokens(pair);
    expect(store.getRefreshToken()).toBe("refresh-1");
    expect(store.getSnapshot().status).toBe("authenticated");
  });

  it("falls back to memory when storage throws on write", () => {
    const store = createSessionStore({
      storage: {
        getItem: () => null,
        setItem: () => {
          throw new Error("QuotaExceededError");
        },
        removeItem: () => {},
      },
      setSessionCookie: vi.fn(),
    });
    store.setTokens(pair);
    expect(store.getRefreshToken()).toBe("refresh-1");
  });

  it("notifies subscribers only when the state changes", () => {
    const store = createSessionStore(fakeEnvironment().environment);
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    store.setTokens(pair);
    store.setTokens({ accessToken: "access-2", refreshToken: "refresh-2" }); // still authenticated
    store.signOut();
    expect(listener).toHaveBeenCalledTimes(2);

    unsubscribe();
    store.setTokens(pair);
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
