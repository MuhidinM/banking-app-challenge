import { describe, expect, it } from "vitest";

import { isAuthPath, isProtectedPath, loginPath } from "./routes";

describe("routes", () => {
  it("knows the sign-in pages", () => {
    expect(isAuthPath("/login")).toBe(true);
    expect(isAuthPath("/register")).toBe(true);
    expect(isAuthPath("/login-help")).toBe(false);
  });

  it("protects everything except sign-in and public pages", () => {
    expect(isProtectedPath("/")).toBe(true);
    expect(isProtectedPath("/accounts/12")).toBe(true);
    expect(isProtectedPath("/login")).toBe(false);
    expect(isProtectedPath("/dev/components")).toBe(false);
    expect(isProtectedPath("/developer")).toBe(true);
  });

  it("builds the login URL", () => {
    expect(loginPath()).toBe("/login");
    expect(loginPath({ next: "/" })).toBe("/login");
    expect(loginPath({ next: "/login?reason=expired" })).toBe("/login");
    expect(loginPath({ next: "/transfer?from=1" })).toBe("/login?next=%2Ftransfer%3Ffrom%3D1");
    expect(loginPath({ next: "/accounts", expired: true })).toBe(
      "/login?next=%2Faccounts&reason=expired",
    );
  });
});
