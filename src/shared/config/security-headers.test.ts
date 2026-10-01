import { describe, expect, it } from "vitest";

import { contentSecurityPolicy, createNonce, securityHeaders } from "./security-headers";

function directives(policy: string) {
  return Object.fromEntries(
    policy.split("; ").map((directive) => {
      const [name, ...sources] = directive.split(" ");
      return [name, sources];
    }),
  );
}

const production = directives(
  contentSecurityPolicy({ nonce: "abc123", apiBaseUrl: "https://api.test", dev: false }),
);

describe("contentSecurityPolicy", () => {
  it("runs only scripts with this response's nonce, and never eval in production", () => {
    expect(production["script-src"]).toEqual(["'self'", "'nonce-abc123'", "'strict-dynamic'"]);
    expect(production["script-src"]).not.toContain("'unsafe-inline'");
  });

  it("allows eval in next dev only", () => {
    const dev = directives(
      contentSecurityPolicy({ nonce: "n", apiBaseUrl: "https://api.test", dev: true }),
    );
    expect(dev["script-src"]).toContain("'unsafe-eval'");
  });

  it("lets the page call its own origin and the API origin, nothing else", () => {
    const local = directives(
      contentSecurityPolicy({ nonce: "n", apiBaseUrl: "http://localhost:4003/api", dev: false }),
    );
    expect(production["connect-src"]).toEqual(["'self'", "https://api.test"]);
    expect(local["connect-src"]).toEqual(["'self'", "http://localhost:4003"]);
  });

  it("allows the mock service worker and self-hosted fonts, and blocks framing", () => {
    expect(production["worker-src"]).toEqual(["'self'"]);
    expect(production["font-src"]).toEqual(["'self'"]);
    expect(production["frame-ancestors"]).toEqual(["'none'"]);
    expect(production["object-src"]).toEqual(["'none'"]);
    expect(production["base-uri"]).toEqual(["'self'"]);
  });
});

describe("createNonce", () => {
  it("is base64 of 16 random bytes and differs each time", () => {
    const nonce = createNonce();
    expect(atob(nonce)).toHaveLength(16);
    expect(createNonce()).not.toBe(nonce);
  });
});

describe("securityHeaders", () => {
  it("sets the standard headers and keeps responses out of search engines", () => {
    const byKey = Object.fromEntries(securityHeaders.map(({ key, value }) => [key, value]));
    expect(byKey).toMatchObject({
      "X-Frame-Options": "DENY",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "X-Robots-Tag": "noindex, nofollow",
    });
    expect(byKey["Permissions-Policy"]).toContain("camera=()");
  });
});
