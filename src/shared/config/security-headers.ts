/**
 * HTTP security headers (ADR-0010). The refresh token sits in localStorage
 * (ADR-0003), so the Content-Security-Policy is the main guard against a script
 * that could read it: only scripts carrying this request's nonce run, and the
 * page can only talk to its own origin and the banking API.
 */

/** Request header the proxy passes the nonce in; the root layout reads it. */
export const NONCE_HEADER = "x-nonce";

export interface ContentSecurityPolicyOptions {
  /** Fresh, unguessable value for this one response. */
  nonce: string;
  /** The banking API origin the browser calls (`env.apiBaseUrl`). */
  apiBaseUrl: string;
  /** `next dev`: React needs `eval` to rebuild server error stacks in the browser. */
  dev: boolean;
}

export function contentSecurityPolicy({
  nonce,
  apiBaseUrl,
  dev,
}: ContentSecurityPolicyOptions): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    // 'strict-dynamic' lets the nonced Next.js scripts load their own chunks;
    // browsers that support it ignore 'self' here, older ones fall back to it.
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      ...(dev ? ["'unsafe-eval'"] : []),
    ],
    // Radix positions popovers with style attributes, which nonces can't cover.
    "style-src": ["'self'", "'unsafe-inline'"],
    "img-src": ["'self'", "data:", "blob:"],
    // next/font serves the fonts from this origin.
    "font-src": ["'self'"],
    "connect-src": ["'self'", new URL(apiBaseUrl).origin],
    // The MSW service worker in mock mode (public/mockServiceWorker.js).
    "worker-src": ["'self'"],
    "manifest-src": ["'self'"],
    "object-src": ["'none'"],
    "base-uri": ["'self'"],
    "form-action": ["'self'"],
    "frame-ancestors": ["'none'"],
  };
  return Object.entries(directives)
    .map(([name, sources]) => `${name} ${sources.join(" ")}`)
    .join("; ");
}

/** Random nonce for one response: 128 bits, base64. */
export function createNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return btoa(String.fromCharCode(...bytes));
}

/** Headers that are the same on every response, set in next.config.ts. */
export const securityHeaders: { key: string; value: string }[] = [
  // Older browsers that don't read CSP frame-ancestors.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Other sites see only our origin, never a path with an account or transaction id.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    // Nothing here needs these. Web Share and the clipboard (receipts) stay allowed.
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()",
  },
  // Browsers ignore it over plain http, so local builds are unaffected.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  // Covers files and redirects too, not only pages with the robots meta tag (N-013).
  { key: "X-Robots-Tag", value: "noindex, nofollow" },
];
