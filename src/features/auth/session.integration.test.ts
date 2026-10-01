import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it, vi } from "vitest";

import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { expireAccessTokens, expireRefreshTokens } from "@/mocks/tokens";
import type { User } from "@/shared/api/types";
import { fakeSessionEnvironment as fakeEnvironment } from "@/test/fake-session-environment";

import { createAppSession } from "./session";
import { REFRESH_TOKEN_KEY, type SessionEnvironment, createSessionStore } from "./session-store";

import type { RunExclusive } from "./refresh-lock";
import type { SessionChannel, SessionMessage } from "./session-channel";

const credentials = { username: "demo.jane", passwordHash: DEMO_PASSWORD };

/** A new tab or a reload: fresh memory, same localStorage. */
function reload(environment: SessionEnvironment) {
  return createAppSession(createSessionStore(environment));
}

function countRefreshes() {
  const counter = { refreshes: 0 };
  server.events.on("request:start", ({ request }) => {
    if (new URL(request.url).pathname === "/api/auth/refresh-token") counter.refreshes += 1;
  });
  return counter;
}

afterEach(() => {
  server.events.removeAllListeners();
});

describe("session against the mock API", () => {
  it("signs in and makes authenticated calls", async () => {
    const { environment } = fakeEnvironment();
    const session = createAppSession(createSessionStore(environment));
    await session.signIn(credentials);

    expect(session.store.getSnapshot().status).toBe("authenticated");
    const me = await session.client.request<User>("/api/users/me");
    expect(me.username).toBe("demo.jane");
  });

  it("survives a reload: one refresh restores it", async () => {
    const { environment } = fakeEnvironment();
    await createAppSession(createSessionStore(environment)).signIn(credentials);

    const afterReload = reload(environment);
    expect(afterReload.store.getSnapshot().status).toBe("unknown");
    const counter = countRefreshes();

    await afterReload.restore();
    expect(afterReload.store.getSnapshot().status).toBe("authenticated");
    expect(counter.refreshes).toBe(1);
    const me = await afterReload.client.request<User>("/api/users/me");
    expect(me.username).toBe("demo.jane");
  });

  it("never writes the access token to storage", async () => {
    const { environment, values } = fakeEnvironment();
    const session = createAppSession(createSessionStore(environment));
    const login = await session.signIn(credentials);

    expect([...values.keys()]).toEqual([REFRESH_TOKEN_KEY]);
    expect([...values.values()]).not.toContain(login.accessToken);
    expect(values.get(REFRESH_TOKEN_KEY)).toBe(login.refreshToken);
  });

  it("restores once even when called twice and raced by a data request", async () => {
    const { environment } = fakeEnvironment();
    await createAppSession(createSessionStore(environment)).signIn(credentials);
    const afterReload = reload(environment);
    const counter = countRefreshes();

    await Promise.all([
      afterReload.restore(),
      afterReload.restore(),
      afterReload.client.request("/api/accounts"),
    ]);
    expect(counter.refreshes).toBe(1);
  });

  it("ends the session as expired when the stored refresh token was rejected", async () => {
    const { environment, values } = fakeEnvironment();
    await createAppSession(createSessionStore(environment)).signIn(credentials);
    expireRefreshTokens();

    const afterReload = reload(environment);
    await afterReload.restore();
    expect(afterReload.store.getSnapshot()).toEqual({
      status: "anonymous",
      endedBecause: "expired",
    });
    expect(values.size).toBe(0);
  });

  it("keeps the user signed in when the restore can't reach the API", async () => {
    const { environment, values } = fakeEnvironment();
    await createAppSession(createSessionStore(environment)).signIn(credentials);
    server.use(http.post(apiUrl("/api/auth/refresh-token"), () => HttpResponse.error()));

    const afterReload = reload(environment);
    await afterReload.restore();
    expect(afterReload.store.getSnapshot().status).toBe("authenticated");
    expect(values.has(REFRESH_TOKEN_KEY)).toBe(true);
  });

  it("does nothing on load when there is no stored session", async () => {
    const counter = countRefreshes();
    const session = reload(fakeEnvironment().environment);
    await session.restore();
    expect(session.store.getSnapshot().status).toBe("anonymous");
    expect(counter.refreshes).toBe(0);
  });
});

/** Two tabs' channels, joined in memory. */
function linkedChannels() {
  type Listener = (message: SessionMessage) => void;
  const listeners = [new Set<Listener>(), new Set<Listener>()] as const;
  const channel = (own: 0 | 1): SessionChannel => ({
    post: (message) => listeners[own === 0 ? 1 : 0].forEach((listener) => listener(message)),
    subscribe(listener) {
      listeners[own].add(listener);
      return () => listeners[own].delete(listener);
    },
  });
  return [channel(0), channel(1)] as const;
}

describe("logout", () => {
  it("forgets the tokens and the cookie, and reports the session ended once", async () => {
    const { environment, values, cookie } = fakeEnvironment();
    const onSessionEnded = vi.fn();
    const session = createAppSession(createSessionStore(environment), { onSessionEnded });
    await session.signIn(credentials);

    session.signOut();

    expect(session.store.getSnapshot()).toEqual({
      status: "anonymous",
      endedBecause: "signed-out",
    });
    expect(session.store.getAccessToken()).toBeNull();
    expect(values.has(REFRESH_TOKEN_KEY)).toBe(false);
    expect(cookie).toHaveBeenLastCalledWith(false);
    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith("signed-out");
    await expect(session.client.request("/api/users/me")).rejects.toMatchObject({ status: 401 });
  });

  it("logs out the other tabs too", async () => {
    const [thisChannel, otherChannel] = linkedChannels();
    const onOtherEnded = vi.fn();
    const thisTab = createAppSession(createSessionStore(fakeEnvironment().environment), {
      channel: thisChannel,
    });
    const otherTab = createAppSession(createSessionStore(fakeEnvironment().environment), {
      channel: otherChannel,
      onSessionEnded: onOtherEnded,
    });
    await thisTab.signIn(credentials);
    await otherTab.signIn(credentials);

    thisTab.signOut();

    expect(otherTab.store.getSnapshot()).toEqual({
      status: "anonymous",
      endedBecause: "signed-out",
    });
    expect(otherTab.store.getAccessToken()).toBeNull();
    expect(onOtherEnded).toHaveBeenCalledExactlyOnceWith("signed-out");
  });

  it('reports "expired" when the API rejects the refresh token', async () => {
    const { environment } = fakeEnvironment();
    const onSessionEnded = vi.fn();
    await createAppSession(createSessionStore(environment)).signIn(credentials);
    expireRefreshTokens();

    const afterReload = createAppSession(createSessionStore(environment), { onSessionEnded });
    await afterReload.restore().catch(() => {});

    expect(onSessionEnded).toHaveBeenCalledExactlyOnceWith("expired");
  });

  it("doesn't report an end for a visitor who never signed in", () => {
    const onSessionEnded = vi.fn();
    const session = createAppSession(createSessionStore(fakeEnvironment().environment), {
      onSessionEnded,
    });

    session.signOut();

    expect(onSessionEnded).not.toHaveBeenCalled();
  });
});

/** Web Locks for tests: tasks run one at a time, in order. */
function sharedLock(): RunExclusive {
  let tail: Promise<unknown> = Promise.resolve();
  return <T>(task: () => Promise<T>) => {
    const run = tail.then(task);
    tail = run.catch(() => {});
    return run;
  };
}

/** Two tabs of one browser: one localStorage, one channel between them. */
async function twoSignedInTabs({ lock }: { lock: boolean }) {
  const { environment } = fakeEnvironment();
  const [channelA, channelB] = linkedChannels();
  const runExclusive = lock ? sharedLock() : undefined;
  const tabA = createAppSession(createSessionStore(environment), {
    channel: channelA,
    runExclusive,
  });
  const tabB = createAppSession(createSessionStore(environment), {
    channel: channelB,
    runExclusive,
  });
  await tabA.signIn(credentials);
  return { tabA, tabB };
}

describe("two tabs (#24)", () => {
  it("signing in in one tab signs in the other", async () => {
    const { tabA, tabB } = await twoSignedInTabs({ lock: true });

    expect(tabB.store.getSnapshot().status).toBe("authenticated");
    expect(tabB.store.getAccessToken()).toBe(tabA.store.getAccessToken());
  });

  it("two tabs needing a refresh make one call and both stay signed in", async () => {
    const { tabA, tabB } = await twoSignedInTabs({ lock: true });
    expireAccessTokens();
    const counter = countRefreshes();

    const [meA, meB] = await Promise.all([
      tabA.client.request<User>("/api/users/me"),
      tabB.client.request<User>("/api/users/me"),
    ]);

    expect(counter.refreshes).toBe(1);
    expect([meA.username, meB.username]).toEqual(["demo.jane", "demo.jane"]);
    expect(tabA.store.getSnapshot().status).toBe("authenticated");
    expect(tabB.store.getSnapshot().status).toBe("authenticated");
  });

  it("without Web Locks, both tabs still stay signed in", async () => {
    const { tabA, tabB } = await twoSignedInTabs({ lock: false });
    expireAccessTokens();

    const [meA, meB] = await Promise.all([
      tabA.client.request<User>("/api/users/me"),
      tabB.client.request<User>("/api/users/me"),
    ]);

    expect([meA.username, meB.username]).toEqual(["demo.jane", "demo.jane"]);
    expect(tabA.store.getSnapshot().status).toBe("authenticated");
    expect(tabB.store.getSnapshot().status).toBe("authenticated");
  });

  it("a refresh token the API rejects ends the session in both tabs", async () => {
    const { tabA, tabB } = await twoSignedInTabs({ lock: true });
    expireAccessTokens();
    expireRefreshTokens();

    await tabA.client.request("/api/users/me").catch(() => {});

    expect(tabA.store.getSnapshot()).toEqual({ status: "anonymous", endedBecause: "expired" });
    expect(tabB.store.getSnapshot()).toEqual({ status: "anonymous", endedBecause: "expired" });
  });
});
