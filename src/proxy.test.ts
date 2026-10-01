// @vitest-environment node
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";

import { proxy } from "./proxy";

function visit(path: string, { signedIn }: { signedIn: boolean }) {
  const request = new NextRequest(new URL(path, "https://bank.test"), {
    headers: signedIn ? { cookie: "has_session=1" } : {},
  });
  const response = proxy(request);
  const location = response.headers.get("location");
  return location ? new URL(location).pathname + new URL(location).search : null;
}

describe("proxy (optimistic redirects on the has_session cookie)", () => {
  it("sends a signed-out visitor from a protected page to login, keeping the way back", () => {
    expect(visit("/accounts/12?tx=117", { signedIn: false })).toBe(
      "/login?next=%2Faccounts%2F12%3Ftx%3D117",
    );
    expect(visit("/", { signedIn: false })).toBe("/login");
  });

  it("lets a signed-out visitor open the sign-in and public pages", () => {
    expect(visit("/login", { signedIn: false })).toBeNull();
    expect(visit("/login?reason=expired", { signedIn: false })).toBeNull();
    expect(visit("/register", { signedIn: false })).toBeNull();
    expect(visit("/dev/components", { signedIn: false })).toBeNull();
  });

  it("sends a signed-in user from login to the dashboard, or to next", () => {
    expect(visit("/login", { signedIn: true })).toBe("/");
    expect(visit("/register", { signedIn: true })).toBe("/");
    expect(visit("/login?next=%2Ftransfer", { signedIn: true })).toBe("/transfer");
  });

  it("ignores an external next", () => {
    expect(visit("/login?next=https%3A%2F%2Fevil.example", { signedIn: true })).toBe("/");
    expect(visit("/login?next=%2F%2Fevil.example", { signedIn: true })).toBe("/");
  });

  it("lets a signed-in user open protected pages", () => {
    expect(visit("/accounts", { signedIn: true })).toBeNull();
  });
});
