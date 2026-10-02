# Security

How the client protects a customer's session, data and money, what it can't protect against as a browser-only app, and what would change in production. Decisions are in [ADR-0003](decisions/0003-token-storage.md) (token storage), [ADR-0005](decisions/0005-token-refresh-strategy.md) (refresh) and [ADR-0010](decisions/0010-content-security-policy.md) (CSP).

## The constraint

The API returns the access and refresh tokens in the JSON body of `/api/auth/login` and `/api/auth/refresh-token`, and expects `Authorization: Bearer <access token>` on every other call. It sets no cookies. A client that talks to it straight from the browser therefore has to hold both tokens in JavaScript. Everything below follows from that.

## Threats and what answers them

| Threat                                                         | Answer                                                                                                                                                                            |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A script injected into the page (XSS) reads the tokens         | Nonce-based CSP: only the app's own scripts run. No HTML from the API is rendered as HTML. The access token is in memory only. The refresh token rotates on every use             |
| The page is framed to trick clicks (clickjacking)              | `frame-ancestors 'none'` and `X-Frame-Options: DENY`                                                                                                                              |
| A phishing link bounces through the login page (open redirect) | `?next=` only accepts a path on this site                                                                                                                                         |
| Data leaks to another host                                     | `connect-src` allows only this origin and the API's origin. No third-party scripts, fonts or analytics                                                                            |
| One user's data shows to the next user of the same browser     | Ending a session clears the query cache and the toasts in every tab                                                                                                               |
| Two tabs spend the same refresh token                          | One refresh at a time across tabs (Web Locks); new tokens are shared over a `BroadcastChannel`                                                                                    |
| A transfer is sent twice                                       | Mutations never retry, Confirm sends once however fast it is clicked, and an offline transfer fails at once instead of being sent later                                           |
| A downloaded CSV runs a formula in a spreadsheet               | Text cells that start with `=`, `+`, `-`, `@`, tab or carriage return get a leading `'`                                                                                           |
| The server's error text reveals internals                      | It is never shown; users see messages written for each error code                                                                                                                 |
| Credentials or tokens reach the wrong host in tests            | Every e2e test fails if the page requests any host but the app and the never-resolving mock API host                                                                              |
| CSRF                                                           | Not applicable to the API: it authenticates with a bearer header, which another site can't make the browser send. The one cookie the app sets (`has_session`) is not a credential |

## Tokens

[`src/features/auth/session-store.ts`](../src/features/auth/session-store.ts)

| Token           | Lifetime   | Kept in                                                  | Why                                                                          |
| --------------- | ---------- | -------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Access          | 10 minutes | A JavaScript variable                                    | Never written anywhere; gone on reload, then restored with the refresh token |
| Refresh         | 24 hours   | `localStorage` (`kb-refresh-token`)                      | Must survive a reload and be readable by every tab                           |
| `has_session=1` | 24 hours   | Cookie: `Path=/; SameSite=Lax`, plus `Secure` over HTTPS | A hint for the route proxy only (below). It holds no token                   |

- If `localStorage` throws on write (for example in some private-browsing modes), the session works for the tab and isn't kept across a reload.
- **Refresh** ([`token-refresh.ts`](../src/shared/api/token-refresh.ts), [`refresh-lock.ts`](../src/features/auth/refresh-lock.ts), [`session-channel.ts`](../src/features/auth/session-channel.ts)):
  - It happens only after a 401. Requests that fail together share one refresh, and each is retried once.
  - Across tabs, the refresh runs inside the Web Lock `kifiya-refresh`. A tab that gets the lock after another tab already rotated the token uses the new tokens without calling the API.
  - A 401 from login or from the refresh call itself never triggers another refresh, so a bad refresh token can't loop.
- **Ending a session**:
  - On logout, on a rejected refresh token, or when another tab reports either, the tokens and the cookie are cleared. The query cache and toasts are emptied, and every tab goes to `/login`, with `?reason=expired` when the session expired.
  - The API has no logout endpoint, so a refresh token that was copied before logout stays valid until it expires (residual risks, below).

## The route proxy is not the security check

[`src/proxy.ts`](../src/proxy.ts) redirects signed-out visitors away from app pages, and signed-in ones away from `/login` and `/register`, by reading `has_session`. It exists to avoid a flash of the wrong page ([ADR-0002](decisions/0002-client-rendered-authenticated-pages.md)).

Anyone can set that cookie, and doing so only shows them an empty app shell. The real checks are elsewhere:

- The client's `RequireSession` checks the stored session.
- The API checks the bearer token on every request.

## Content-Security-Policy

Built per response in [`security-headers.ts`](../src/shared/config/security-headers.ts) and set by the proxy, with a fresh 128-bit nonce each time. Next.js puts the nonce on its own scripts; the root layout puts it on the theme script.

| Directive         | Value                                                                       | Why                                                                                                           |
| ----------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `default-src`     | `'self'`                                                                    | Anything not listed below comes only from this origin                                                         |
| `script-src`      | `'self' 'nonce-…' 'strict-dynamic'` (`'unsafe-eval'` only under `next dev`) | Only scripts carrying this response's nonce run, plus the chunks they load. No inline or injected script runs |
| `style-src`       | `'self' 'unsafe-inline'`                                                    | Radix positions popovers with `style` attributes, which a nonce can't cover. Styles can't run code            |
| `img-src`         | `'self' data: blob:`                                                        | App images and inline icons                                                                                   |
| `font-src`        | `'self'`                                                                    | `next/font` serves the fonts from this origin                                                                 |
| `connect-src`     | `'self'` and the API origin from `NEXT_PUBLIC_API_BASE_URL`                 | Even an injected script couldn't send data anywhere else                                                      |
| `worker-src`      | `'self'`                                                                    | The mock-mode service worker                                                                                  |
| `manifest-src`    | `'self'`                                                                    |                                                                                                               |
| `object-src`      | `'none'`                                                                    | No plugins                                                                                                    |
| `base-uri`        | `'self'`                                                                    | An injected `<base>` can't redirect relative URLs                                                             |
| `form-action`     | `'self'`                                                                    | Forms can't post elsewhere                                                                                    |
| `frame-ancestors` | `'none'`                                                                    | The app can't be framed                                                                                       |

**`eval` is blocked in production.** Zod v4 normally tests for `eval` support on its first parse. `z.config({ jitless: true })` in [`env.ts`](../src/shared/config/env.ts) turns that test off, so the CSP logs no violation.

## Other headers

Set on every response in [`next.config.ts`](../next.config.ts):

| Header                       | Value                                                                              | Why                                                                                    |
| ---------------------------- | ---------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------- |
| `X-Frame-Options`            | `DENY`                                                                             | Framing protection for browsers that ignore `frame-ancestors`                          |
| `X-Content-Type-Options`     | `nosniff`                                                                          | Files are only used as the type they are served as                                     |
| `Referrer-Policy`            | `strict-origin-when-cross-origin`                                                  | Other sites see the origin only, never a path with an account or transaction id        |
| `Permissions-Policy`         | `camera=(), microphone=(), geolocation=(), payment=(), usb=(), browsing-topics=()` | Features the app doesn't use are off. Web Share and the clipboard stay on for receipts |
| `Strict-Transport-Security`  | `max-age=63072000; includeSubDomains`                                              | HTTPS only, for two years (browsers ignore it over plain HTTP)                         |
| `Cross-Origin-Opener-Policy` | `same-origin`                                                                      | Pages opened from elsewhere can't reach this window                                    |
| `X-Robots-Tag`               | `noindex, nofollow`                                                                | Kept out of search results, including files and redirects ([N-013](spec-notes.md))     |

The root layout also sets `robots: { index: false, follow: false }`, and `/robots.txt` disallows everything. A public page that looks like a bank's login should not be found by searching.

## Input and output

- **Rendering:** React escapes every value it renders. The only `dangerouslySetInnerHTML` is the theme script in the root layout and the global error page. It is a constant from [`theme-preference.ts`](../src/shared/theme/theme-preference.ts) with no user or API data in it, and it carries the nonce.
- **Server error text is never shown.** API errors become an `ApiError` with the API's code ([`api-error.ts`](../src/shared/api/api-error.ts)), and users see the message written for that code ([`error-messages.ts`](../src/shared/api/error-messages.ts)). The server's own `message` is kept only for logs. An ESLint rule forbids reading `serverMessage` outside `src/shared/api`.
- **Responses are validated.** Auth and money responses are checked with `zod/mini` schemas at the boundary ([`src/features/*/api.ts`](../src/features)). A malformed response fails there with a generic message instead of putting odd values on screen.
- **The return path** ([`return-path.ts`](../src/features/auth/return-path.ts)) is parsed against a fixed origin. Anything that would leave the site is rejected and replaced with the dashboard, including `//evil.example` and `/\evil.example`, which browsers treat as other hosts. So are the sign-in pages themselves.
- **CSV export** ([`csv.ts`](../src/shared/lib/csv.ts)) quotes cells as RFC 4180 requires and guards against formulas, as in the table above. The file is made in the browser, so nothing is sent anywhere.
- **Environment variables** are all `NEXT_PUBLIC_*`, so they are built into the public bundle. They hold the API origin and two on/off flags, never a secret. They are validated at startup ([`env.ts`](../src/shared/config/env.ts)).

## Money safety

- **No retries:** mutations never retry ([`query-client.ts`](../src/shared/api/query-client.ts)). A retried transfer could send money twice.
- **No queueing offline:** mutations use `networkMode: "always"`. Offline, a transfer fails at once with the offline message. Otherwise TanStack Query would hold it and send it when the connection returns, possibly long after the user gave up.
- **Confirm sends once:** a ref, not React state, marks a transfer as in flight ([`transfer-flow.tsx`](../src/features/transfers/transfer-flow.tsx)). Two clicks in the same tick send one request; the e2e test double-clicks Confirm to prove it.
- **Review first:** nothing is sent from the form. A review dialog shows the amount, both accounts, the fee and the note, with a warning that transfers can't be reversed.

## Dependencies

- No third-party scripts, analytics, fonts or iframes. Fonts are self-hosted through `next/font`.
- `pnpm-lock.yaml` pins every dependency, and CI installs with `--frozen-lockfile`.
- `packageManager` pins the pnpm version.

## How it is tested

- **CSP and headers:** [`security-headers.test.ts`](../src/shared/config/security-headers.test.ts) checks the policy and the header values.
- **A guard on every e2e test:** [`e2e/support.ts`](../e2e/support.ts) fails the test if the page logs a CSP violation, or requests any host except `localhost` and `api.e2e.invalid`. That host never resolves; the mock answers for it inside the browser. So a too-strict policy, a missing mock handler or a stray request shows up as a failing test.
- **Session and redirects:** unit tests cover the return path (open-redirect cases), the session store and cookie, single-flight refresh, the cross-tab lock and broadcast, and clearing the cache when a session ends. The e2e tests cover logout across two tabs, expiry and route protection.
- **Credentials in automated checks:** they only ever go to the mock. The Lighthouse script refuses to run unless the app's CSP shows a local API.

## Residual risks

- **XSS is reduced, not ruled out:** a script that ran despite the CSP could read the refresh token from `localStorage` and use it until it expires (24 hours, or until rotated).
- **No server-side logout:** the API has no logout or revoke endpoint, so a copied refresh token stays valid after the user logs out.
- **Transaction ids in URLs:** receipts and transaction details have shareable URLs (`/transfer/receipt/<id>`, `?tx=<id>`). The id alone shows nothing: the page needs a signed-in session, and the API only returns the owner's transactions. `Referrer-Policy` keeps these paths from reaching other sites.
- **Rate limiting and lockout are the API's job;** the client adds none.

## In production

A backend-for-frontend would close the main gap:

- Next.js route handlers would sit between the browser and the API, and call the API on the browser's behalf.
- The tokens would live in `HttpOnly; Secure; SameSite=Strict` cookies, which no script can read. The server would refresh them.
- Mutations would need a CSRF token (double-submit or a custom header check), since cookies are now the credential.
- The CSP's `connect-src` could then be `'self'` only.
- Logout would clear the cookies server-side, and with an API revoke endpoint, end the refresh token too.

It isn't built here because the brief asks for a client of the given API, with the refresh flow handled in that client.
