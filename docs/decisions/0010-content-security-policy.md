# ADR-0010 · Nonce-based Content-Security-Policy, pages rendered per request

**Status:** accepted · 2026-10-01

## Context

The refresh token sits in `localStorage` (ADR-0003), so any script that runs on the page can read it. A Content-Security-Policy limits which scripts run and where the page can send data. Next.js App Router pages carry inline scripts (the React Server Components payload, and our theme script in the root layout), so a policy without `'unsafe-inline'` needs either a nonce per response or a hash per script. The payload scripts differ per page and per build, so hashes don't work for them.

The Next.js CSP guide offers three ways: a nonce set in the proxy (pages must render per request), no nonce with `'unsafe-inline'` (pages stay static), or experimental Subresource Integrity, which covers external files but not the inline payload.

## Decision

- `src/proxy.ts` creates a 128-bit nonce for every page it lets through and sets the policy on both the request (Next.js reads the nonce from it and adds it to its own scripts) and the response. The root layout reads the nonce from the `x-nonce` request header and puts it on the theme script.
- Policy (`src/shared/config/security-headers.ts`): `script-src 'self' 'nonce-…' 'strict-dynamic'` (plus `'unsafe-eval'` under `next dev` only); `connect-src 'self'` and the API origin from `NEXT_PUBLIC_API_BASE_URL`; `worker-src 'self'` for the MSW worker in mock mode; `font-src 'self'` (next/font is self-hosted); `img-src 'self' data: blob:`; `style-src 'self' 'unsafe-inline'`; `object-src 'none'`; `base-uri`/`form-action 'self'`; `frame-ancestors 'none'`.
- Headers that never change are set for every path in `next.config.ts`: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, a `Permissions-Policy` that turns off camera, microphone, geolocation, payment, USB and topics, HSTS, `Cross-Origin-Opener-Policy: same-origin` and `X-Robots-Tag: noindex, nofollow`.
- `robots.txt` disallows everything; with the robots meta tag and `X-Robots-Tag` this keeps the branded login out of search results (N-013).

## Consequences

- Reading the request in the root layout makes every page render per request instead of being prerendered. The pages are thin shells (data is fetched in the browser, ADR-0002), so the cost is a small server render per navigation, and no CDN caching of the HTML.
- Injected markup can't run script (inline handlers and `javascript:` URLs are blocked), and a script that does run can't send the token to another origin with `fetch`. Checked in a production build: an `onerror` handler injected with `innerHTML` was blocked, a `fetch` to another origin was refused, and sign-in, navigation and the theme script worked with no violations.
- `style-src` keeps `'unsafe-inline'`: Radix positions popovers with `style` attributes, which nonces can't cover. Injected CSS can't run script.
- `upgrade-insecure-requests` is left out: it would break local production builds over plain http; HSTS does the same job on the deployed https site.
- Production with a backend-for-frontend (ADR-0003) would keep the policy and remove the token from script's reach entirely.
