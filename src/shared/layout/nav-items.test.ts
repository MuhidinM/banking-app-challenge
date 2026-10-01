import { describe, expect, it } from "vitest";

import { BOTTOM_NAV_ITEMS, SIDEBAR_ITEMS, isActive } from "./nav-items";

describe("isActive", () => {
  it.each([
    ["/", "/", true],
    ["/accounts", "/", false],
    ["/accounts", "/accounts", true],
    ["/accounts/12", "/accounts", true],
    ["/accounts/new", "/accounts", true],
    ["/accounts-old", "/accounts", false],
    ["/transfer/receipt/117", "/transfer", true],
    ["/pay-bill", "/transfer", false],
  ])("%s is under %s: %s", (pathname, href, expected) => {
    expect(isActive(pathname, href)).toBe(expected);
  });
});

describe("navigation order", () => {
  it("lists the five sections in the sidebar, Transfer in the middle of the bottom nav", () => {
    expect(SIDEBAR_ITEMS.map((item) => item.label)).toEqual([
      "Home",
      "Accounts",
      "Activity",
      "Transfer",
      "Profile",
    ]);
    expect(BOTTOM_NAV_ITEMS.map((item) => item.label)).toEqual([
      "Home",
      "Accounts",
      "Transfer",
      "Activity",
      "Profile",
    ]);
  });
});
