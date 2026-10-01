import { HttpResponse, http } from "msw";
import { afterEach, describe, expect, it } from "vitest";

import { DEMO_PASSWORD } from "@/mocks/fixtures";
import { apiUrl } from "@/mocks/http";
import { server } from "@/mocks/node";
import { expireRefreshTokens } from "@/mocks/tokens";
import type { User } from "@/shared/api/types";
import { fakeSessionEnvironment as fakeEnvironment } from "@/test/fake-session-environment";

import { createAppSession } from "./session";
import { REFRESH_TOKEN_KEY, type SessionEnvironment, createSessionStore } from "./session-store";

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
