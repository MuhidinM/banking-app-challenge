import { describe, expect, it } from "vitest";

import { formatRemaining, tokenExpiry } from "./token-expiry";

const jwt = (payload: object) =>
  `e30.${btoa(JSON.stringify(payload)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "")}.sig`;

describe("tokenExpiry", () => {
  it("reads exp from a JWT", () => {
    expect(tokenExpiry(jwt({ sub: "1", exp: 1_790_000_000 }))).toEqual(new Date(1_790_000_000_000));
  });

  it.each([
    ["no token", null],
    ["not a JWT", "expired-by-session-inspector"],
    ["unreadable payload", "a.%%%.c"],
    ["no exp", jwt({ sub: "1" })],
  ])("is null for %s", (_case, token) => {
    expect(tokenExpiry(token)).toBeNull();
  });
});

describe("formatRemaining", () => {
  const now = new Date("2026-10-01T12:00:00Z");
  const inSeconds = (s: number) => new Date(now.getTime() + s * 1000);

  it.each([
    [581, "9:41"],
    [59, "0:59"],
    [3900, "1:05:00"],
    [0, "expired"],
    [-5, "expired"],
  ])("%i s → %s", (seconds, text) => {
    expect(formatRemaining(inSeconds(seconds), now)).toBe(text);
  });
});
