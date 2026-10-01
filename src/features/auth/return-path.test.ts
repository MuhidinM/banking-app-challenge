import { describe, expect, it } from "vitest";

import { safeReturnPath } from "./return-path";

describe("safeReturnPath", () => {
  it.each([
    ["/accounts", "/accounts"],
    ["/accounts/12?tx=117#receipt", "/accounts/12?tx=117#receipt"],
    ["/transfer?from=1000000001", "/transfer?from=1000000001"],
  ])("keeps a path on this site: %s", (next, expected) => {
    expect(safeReturnPath(next)).toBe(expected);
  });

  it.each([
    ["missing", undefined],
    ["repeated", ["/accounts", "/profile"]],
    ["empty", ""],
    ["relative", "accounts"],
    ["another origin", "https://evil.example/login"],
    ["protocol-relative", "//evil.example"],
    ["backslash trick", "/\\evil.example"],
    ["javascript URL", "javascript:alert(1)"],
    ["the login page", "/login?reason=expired"],
    ["the register page", "/register"],
  ])("goes home for %s", (_case, next) => {
    expect(safeReturnPath(next)).toBe("/");
  });
});
