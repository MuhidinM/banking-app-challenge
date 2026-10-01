import { describe, expect, it } from "vitest";

import { DEMO_PASSWORD } from "./fixtures";
import { apiUrl } from "./http";
import { getDb, resetMockApi, restoreMockApi, snapshotMockApi } from "./state";
import { expireAccessTokens, rotateTokens } from "./tokens";

const post = (path: `/api/${string}`, body: unknown) =>
  fetch(apiUrl(path), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

async function signIn() {
  const response = await post("/api/auth/login", {
    username: "demo.jane",
    passwordHash: DEMO_PASSWORD,
  });
  return (await response.json()) as { accessToken: string; refreshToken: string };
}

// A page reload, as the browser mock sees it: a fresh mock (the seed), then
// the saved snapshot loaded into it.
function reload(saved: string) {
  resetMockApi();
  return restoreMockApi(saved);
}

describe("mock API snapshot (keeps the browser mock across reloads)", () => {
  it("keeps the refresh token working after a reload", async () => {
    const { refreshToken } = await signIn();

    expect(reload(snapshotMockApi())).toBe(true);

    const response = await post("/api/auth/refresh-token", { refreshToken });
    expect(response.status).toBe(200);
  });

  it("without a snapshot, the stored refresh token is unknown (the bug in #80)", async () => {
    const { refreshToken } = await signIn();

    resetMockApi();

    const response = await post("/api/auth/refresh-token", { refreshToken });
    expect(response.status).toBe(401);
  });

  it("keeps balances and transactions, with real Dates", () => {
    const db = getDb();
    const account = db.accounts[0]!;
    account.balanceCents = 123_45;
    const latest = db.transactions.at(-1)!;

    reload(snapshotMockApi());

    const restored = getDb();
    expect(restored.accounts[0]!.balanceCents).toBe(123_45);
    expect(restored.transactions).toHaveLength(db.transactions.length);
    const restoredLatest = restored.transactions.at(-1)!;
    expect(restoredLatest.timestamp).toBeInstanceOf(Date);
    expect(restoredLatest.timestamp.getTime()).toBe(latest.timestamp.getTime());
    expect(restored.nextId).toEqual(db.nextId);
  });

  it("keeps the token rules: a used refresh token stays used, an expired one stays expired", async () => {
    const used = await signIn();
    rotateTokens(used.refreshToken);
    const expired = await signIn();
    expireAccessTokens();

    reload(snapshotMockApi());

    expect(rotateTokens(used.refreshToken)).toBeNull();
    const response = await fetch(apiUrl("/api/users/me"), {
      headers: { Authorization: `Bearer ${expired.accessToken}` },
    });
    expect(response.status).toBe(401);
  });

  it.each([
    ["not JSON", "{"],
    ["another version", JSON.stringify({ version: 0, db: {}, tokens: {} })],
    ["missing parts", JSON.stringify({ version: 1 })],
  ])("ignores a snapshot that is %s and changes nothing", (_case, saved) => {
    const before = snapshotMockApi();

    expect(restoreMockApi(saved)).toBe(false);

    expect(snapshotMockApi()).toBe(before);
  });
});
