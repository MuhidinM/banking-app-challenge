// @vitest-environment node
import { AsyncLocalStorage } from "node:async_hooks";

import { NextRequest } from "next/server";
import { beforeAll, describe, expect, it } from "vitest";

import { config, proxy } from "./proxy";

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

describe("proxy matcher", () => {
  // Next's matcher test helper needs the AsyncLocalStorage global that the
  // Next.js runtime provides. It must be set before the helper is imported.
  let doesProxyMatch: (options: { config: typeof config; url: string }) => boolean;
  beforeAll(async () => {
    (globalThis as { AsyncLocalStorage?: unknown }).AsyncLocalStorage = AsyncLocalStorage;
    // The docs call it unstable_doesProxyMatch; Next 16.3 still exports the old name.
    ({ unstable_doesMiddlewareMatch: doesProxyMatch } =
      await import("next/experimental/testing/server"));
  });

  it.each(["/", "/login", "/accounts/12", "/transfer/receipt/117"])(
    "runs on the page %s",
    (url) => {
      expect(doesProxyMatch({ config, url })).toBe(true);
    },
  );

  it.each([
    "/mockServiceWorker.js",
    "/brand/kifiya-logo.svg",
    "/favicon.ico",
    "/_next/static/chunks/main.js",
    "/_next/image",
  ])("skips the file %s", (url) => {
    expect(doesProxyMatch({ config, url })).toBe(false);
  });
});

describe("proxy on files", () => {
  // In case a file in public/ isn't in the matcher: a signed-out request for it
  // must not be redirected. A browser refuses a service worker behind a redirect.
  it.each(["/mockServiceWorker.js", "/robots.txt", "/brand/new-logo.png"])(
    "never redirects %s",
    (path) => {
      expect(visit(path, { signedIn: false })).toBeNull();
    },
  );
});
