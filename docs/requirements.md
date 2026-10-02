# Requirements — traceability and release checklist

Every line from the brief has an ID. A row is ticked only when it's **verified** (test name, screenshot or manual check noted in "Evidence").
Run the whole list before submitting. Status: ☐ todo · ◐ in progress · ☑ verified.

## A. Tech stack (brief: "Tech Stack")

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-TS-01 | React 18+ with TypeScript **strict** | T-001 | React 19.2; `strict` + `noUncheckedIndexedAccess` in tsconfig.json; `tsc --noEmit` clean (#1) | ☑ |
| R-TS-02 | Next.js App Router (or Vite + RR) | T-001 | Next.js 16.3 App Router under `src/app` (#1) | ☑ |
| R-TS-03 | Function components + hooks only, no class components (lint rule) | T-003 | ESLint `no-restricted-syntax` rejects classes extending Component/PureComponent (#3) | ☑ |

## B. API integration (Req 1)

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-API-01 | Base URL from env; `.env.example` committed | T-004 | Base URL from `NEXT_PUBLIC_API_BASE_URL`, validated at startup in `src/shared/config/env.ts`; `.env.example` committed (#4) | ☑ |
| R-API-02 | All calls async and handle network errors (offline, timeout, DNS) | T-020 | `createHttpClient` is async throughout; no response → `NetworkError` (offline / timeout / unreachable), tested; cancellations pass through untouched (#16) | ☑ |
| R-API-03 | Single typed API client; components never call `fetch` (lint rule `no-restricted-globals` outside `shared/api`) | T-020, T-003 | One client in `src/shared/api/http-client.ts`; ESLint bans `fetch` everywhere else in src/ (#3, #16) | ☑ |
| R-API-04 | Store access + refresh tokens | T-022 | Access token in memory, refresh token in localStorage (memory fallback), both rotated on refresh (`session-store.ts`); tests check the access token never reaches storage (#18) | ☑ |
| R-API-05 | `Authorization: Bearer` on protected calls | T-020 | Bearer token attached on protected calls, read per request; `auth: false` for login/register/refresh; tested (#16) | ☑ |
| R-API-06 | On 401 → `POST /api/auth/refresh-token` → replace **both** tokens → retry original **once** | T-021 | On 401 the client refreshes via POST /api/auth/refresh-token, stores both rotated tokens and retries once (`http-client.ts`, `token-refresh.ts`); integration tests against the mock API (#17) | ☑ |
| R-API-07 | Concurrent 401s trigger **one** refresh (unit test) | T-021 | Five concurrent 401s → exactly one refresh request, all five succeed (`token-refresh.integration.test.ts`); unit tests with a controllable refresh (#17) | ☑ |
| R-API-08 | Refresh fails → clear session → login | T-021, T-025 | A rejected refresh clears the tokens and ends the session as expired (#17); `RequireSession` sends the user to `/login?reason=expired` with the way back (#21); the query cache is cleared (#23) | ☑ |
| R-API-09 | Transfer `note` optional, max 140 chars, becomes description | T-060 |  | ☐ |
| R-API-10 | `balanceAfter` shown when present, handled when missing | T-052 | Details and the shared receipt show "Balance after" only when the API sends it; tested with a seed row without it (#35) | ☑ |
| R-API-11 | Error codes → friendly messages (ACC_002, ACC_004, AUTH_003, VAL_001 + all others in API-NOTES) | T-023 | `describeError()` maps every documented code to copy, per screen and per field (e.g. ACC_002 → amount, AUTH_003 → username); 31 tests (#19) | ☑ |

## C. Authentication and registration (Req 2)

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-AUTH-01 | Login: username + password → `POST /api/auth/login` → store tokens → dashboard | T-024 | Login page signs in through `POST /api/auth/login`, stores the tokens and goes to `/` or the validated `?next=` path; component test (#20) | ☑ |
| R-AUTH-02 | Friendly message on invalid credentials | T-024 | Wrong credentials show "Username or password is incorrect." from `describeError(…, "login")`; network failures get their own copy; component tests (#20) | ☑ |
| R-AUTH-03 | Register: username, password, first, last, email (optional), phone; client validation | T-026 | All six fields plus confirm password; `validateRegister()` applies the API rules (username 3–50, password ≥6, phone pattern, email optional) before sending; 14 tests (#22) | ☑ |
| R-AUTH-04 | Register calls `POST /api/auth/register`; then auto-login **or** login with confirmation | T-026 | `POST /api/auth/register`, then automatic sign-in and the dashboard with a welcome toast naming the new checking account; if only the sign-in fails, login with "Your account is ready" (#22) | ☑ |
| R-AUTH-05 | Duplicate username / email errors shown on the right field | T-026 | AUTH_003 on Username, AUTH_004 on Email via `describeError(…, "register")`, focused, cleared when the field changes; component tests (#22) | ☑ |
| R-AUTH-06 | Protected pages unreachable without a session | T-025 | `proxy.ts` redirects signed-out visitors from protected pages to `/login?next=…`; `RequireSession` renders protected pages only with a session; tested, and the proxy redirect checked in the browser (#21) | ☑ |
| R-AUTH-07 | Valid session skips the login page | T-025 | Signed in, `/login` and `/register` go to `next` or `/` (proxy on the cookie, `RedirectWhenSignedIn` after a restore); external `next` ignored; tested (#21) | ☑ |
| R-AUTH-08 | Session survives page reload | T-022 | Restore on load with one refresh; integration tests simulate a reload (#18); confirmed in Chrome with mock mode: sign in, reload, still signed in (#20, after #80 kept the mock across reloads) | ☑ |
| R-AUTH-09 | Logout clears the session (tokens + query cache) | T-027 | `signOut()` clears the tokens, storage and cookie; `onSessionEnded` clears the query cache and toasts; other tabs log out through a BroadcastChannel; tested (#23) | ☑ |

## D. Main flow (Req 3)

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-FLOW-01 | Dashboard greeting from `GET /api/users/me` | T-040 | "Good morning / afternoon / evening" by local time with the full name from `GET /api/users/me` (`useCurrentUser`); tested (#29) | ☑ |
| R-FLOW-02 | Total balance across **all** accounts | T-040 | `listAll()` loads every page of `GET /api/accounts`; `totalBalance()` adds in cents; tested with 13 and 120 accounts (#29) | ☑ |
| R-FLOW-03 | Accounts list (`GET /api/accounts`, paginated): number, type, balance | T-041 | `/accounts` lists every account across all pages of `GET /api/accounts`: type, •••• last four, balance, with the count and total under the title; tested with 60 accounts (#30) | ☑ |
| R-FLOW-04 | Recent transactions of one account on dashboard | T-040 | The latest 3 transactions of the first account, named above the rows, with "View all" to its history; tested against the mock (#29) | ☑ |
| R-FLOW-05 | Navigation to all other screens | T-030 | Sidebar and bottom nav link Home, Accounts, Activity, Transfer and Profile, with the current section marked (`aria-current`); the screens behind them are built in M4–M8, Pay bill is reached from the dashboard (#29) (#26) | ◐ |
| R-FLOW-06 | Create account: type + optional initial balance → `POST /api/accounts` | T-042 | `/accounts/new`: six types (three plus "More account types"), optional deposit sent as 0 when empty, `POST /api/accounts`; amount errors on the field; tested (#31) | ☑ |
| R-FLOW-07 | New account appears without full reload | T-042 | The created account is added to the cached list, then the list is refetched; test: "2 accounts" becomes "3 accounts · ETB 11,000.00 total" on the same screen (#31) | ☑ |
| R-FLOW-08 | Transfer: from (own accounts), recipient number, amount, optional note | T-060 |  | ☐ |
| R-FLOW-09 | Review step showing details + "cannot be reversed" warning before calling API | T-061 |  | ☐ |
| R-FLOW-10 | Confirmation screen with receipt: amount, recipient, new balance, reference (not just a toast) | T-062 |  | ☐ |
| R-FLOW-11 | Specific errors: "Insufficient funds", "Cannot transfer to the same account", "Account not found" | T-063 |  | ☐ |
| R-FLOW-12 | Bill payment: from account, biller, amount → `POST /api/accounts/pay-bill` | T-070 |  | ☐ |
| R-FLOW-13 | History per account `GET /api/transactions/{accountId}`, Load more or infinite scroll | T-050 | `useTransactionHistory` infinite query on `GET /api/transactions/{accountId}`, Load more with "Showing x of y" on `/activity?account=` (#33) | ☑ |
| R-FLOW-14 | Row shows amount, type, direction, timestamp, description | T-051 | `TransactionRow`: type icon, description or a fallback from type and other account, "Type · time", signed amount; direction by sign, colour and the spoken "Money in/out" (#34) | ☑ |
| R-FLOW-15 | Filter All / Money in (CREDIT) / Money out (DEBIT) | T-053 | `DirectionFilter` (All / Money in / Money out) and the account select on `/activity`, both in the URL (`?account=1&direction=DEBIT`); reload and Back/Forward keep them (#36) | ☑ |
| R-FLOW-16 | Rows grouped by day: Today, Yesterday, date | T-051 | `groupTransactionsByDay` by local day (Today, Yesterday, "Monday, 28 Sep"); tested across local midnight in Africa/Addis_Ababa (#34) | ☑ |
| R-FLOW-17 | Row → detail: type, direction, reference, counterparty, balanceAfter if present | T-052 | `TransactionDetails` via `?tx=` (dialog on web, sheet on phones): type, direction, From/To account, reference `TX-000117`, balance after; reload reopens, Back closes (#35) | ☑ |
| R-FLOW-18 | After transfer / bill / new account, balances and history refresh automatically | T-064 |  | ☐ |

## E. UX, accessibility, errors (Req 4)

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-UX-01 | Follows the design spec (layout, hierarchy, spacing, colour, type) | all UI | Theme generated from `design-tokens.json` (colours, type scale, radii, shadows, spacing, sizes, gradients; both themes) by `pnpm tokens`, checked in CI (#9). Screen-by-screen fidelity follows with each UI task | ◐ |
| R-UX-02 | Light + dark theme; follows OS; user override | T-012 | Both themes from the tokens (#9); follows the OS by default including live changes; System / Light / Dark switch stored per device and synced across tabs (#11). Tests in `theme-preference.test.ts` and `theme-toggle.test.tsx`; checked in the browser | ☑ |
| R-UX-03 | Desktop layout (sidebar) + mobile layout (bottom nav) below 768 px | T-030 | `AppShell`: 260 px sidebar from 768 px, bottom nav with the raised Transfer disc below it; measured against the redlines at 1440×900 and 390×844 (#26) | ☑ |
| R-UX-04 | Skeletons/spinners while loading | T-014 | Skeletons matching row geometry (identical heights measured) inside a `LoadingRegion` status, reduced-motion aware (#13); route-level `loading.tsx` in the app shell: a header and card of row skeletons, announced as "Loading the page" (#28). Each screen uses them as it is built | ◐ |
| R-UX-05 | Submit buttons disabled while submitting; no double submit | T-013 | `Button loading` disables the button with aria-busy and ignores clicks; tested (#12). Each form uses it while submitting (T-024 on) | ◐ |
| R-UX-06 | Empty states: no accounts, no transactions | T-014 | `EmptyState` with an action (#13); no transactions on the Activity page (#33); no accounts on the dashboard (#29) and the accounts page, with "Open an account" (#30) | ◐ |
| R-UX-07 | Errors from API code + generic network message; **never raw backend text** | T-023 | Copy from the API code plus offline / timeout / unreachable messages; the server text is never used and ESLint forbids reading it outside src/shared/api (#19). Route error pages use the same copy, with a no-connection icon when offline (#28). Each screen shows it as it is built | ◐ |
| R-UX-08 | Validation before send: positive amounts, 10-digit account numbers, required fields | T-060, T-070 |  | ☐ |
| R-UX-09 | Labelled fields | T-013 | Every field component is labelled through FormField (label `for` the control) and described by its hint/error; tested by role and accessible name (#12). Applied in each form from T-024 on | ◐ |
| R-UX-10 | Keyboard navigation | T-091 |  | ☐ |
| R-UX-11 | Visible focus (spec: 3px accent-soft + accent border on controls; 2px accent offset 2 on buttons/links) | T-011 | Spec focus styles in `src/shared/theme/base.css`: 2px accent `:focus-visible` outline for buttons/links, `focus-control` accent border + 3px ring for fields; checked with keyboard Tab (#10). Applied to each component as it is built (T-013 on) | ◐ |
| R-UX-12 | Sufficient contrast (WCAG AA, both themes) | T-010, T-091 | Contrast of every token colour pair measured in `scripts/design-contrast.test.ts` (#9). Ink and muted text pass in both themes; 9 pairs from the spec tokens fail and are kept by decision (N-016). Full axe check in T-091 | ◐ |
| R-UX-13 | `aria-live` for toasts and inline errors | T-015 | Field errors in polite live regions (#12); toasts announced through Radix live regions, errors assertively, other toasts politely; tested (#14). Each flow uses them as it is built | ◐ |
| R-UX-14 | Usable 360 → 1440 px | T-092 |  | ☐ |

## F. Code quality and testing (Req 5)

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-CQ-01 | Feature/domain folders | T-002 | Feature-based layout documented in `src/README.md`; layer direction `app → features → shared` enforced by `import/no-restricted-paths` (#2). Complete once the first feature folders land (M1/M2) | ◐ |
| R-CQ-02 | Typed API models, no `any` (lint: `no-explicit-any` as error) | T-003, T-020 | `no-explicit-any` as an error (#3); API types generated from the OpenAPI snapshot (#8); the auth API calls the client with them and validates token responses (#17) | ☑ |
| R-CQ-03 | Small components, custom hooks, composition over prop drilling | all | review | ☐ |
| R-CQ-04 | Clear server-state vs UI-state split | ADR-0004 |  | ☐ |
| R-CQ-05 | ESLint + Prettier configured and passing | T-003 | `pnpm lint` (zero warnings) and `pnpm format:check` pass locally, in the pre-commit hook (#3) and in CI on every PR (`.github/workflows/ci.yml`, #6) | ☑ |
| R-CQ-06 | Unit tests: API client | T-020 | `http-client.test.ts` (12) and `api-error.test.ts` (8): success, ErrorResponse → ApiError, network error, offline, timeout, abort, headers and bodies (#16) | ☑ |
| R-CQ-07 | Unit tests: refresh logic incl. many concurrent 401s → one refresh | T-021 | `token-refresh.test.ts` (8) and `token-refresh.integration.test.ts` (7), including the many-concurrent-401s case; breaking single-flight fails 5 of them (#17) | ☑ |
| R-CQ-08 | ≥1 component test (RTL) | T-024 | RTL component tests for the UI kit and the login form (7 tests: sign-in, wrong credentials, disabled while signing in, missing fields, network failure, expired banner, show/hide password) (#20) | ☑ |
| R-CQ-09 | E2E tests (plus) | T-093, T-104 | Playwright in CI (own job) on a mock-mode production build: sign-in, register, route protection with ?next=, reload, logout, two-tab logout, axe on every page; fails on any CSP violation or off-site request (#48). Token refresh mid-session (clock moved past the 10-minute expiry), open account, history Load more, direction filter, account selector and ?tx= details, axe on the details dialog and /accounts/new (#94). Transfer and bill payment follow once built (#94) | ◐ |
| R-CQ-10 | `.env.example` committed | T-004 | `.env.example` documents every variable (#4) | ☑ |

## G. Submission

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-SUB-01 | Public repo on personal GitHub | T-100 |  | ☐ |
| R-SUB-02 | Live deployment URL in README (plus) | T-101 |  | ☐ |
| R-SUB-03 | README: setup, env vars, features, architecture (esp. auth/refresh), assumptions, trade-offs | T-102 |  | ☐ |
| R-SUB-04 | README shows security trade-offs (httpOnly cookies via BFF) | T-102 |  | ☐ |
| R-SUB-05 | Submitted within 3 days | T-103 |  | ☐ |

## H. Additional quality criteria (beyond the brief)

| ID | Item | Task | Evidence | ✓ |
|---|---|---|---|---|
| X-01 | Receipt route survives reload (`/transfer/receipt/[txId]`) | T-062 |  | ☐ |
| X-02 | UTC timestamps parsed correctly; day grouping test at midnight boundary | T-016 | `parseApiDate()` reads offset-free API timestamps as UTC; day grouping in the local zone; tests pin Africa/Addis_Ababa and cover the midnight boundary both ways (#15) | ☑ |
| X-03 | Cross-tab refresh: two tabs, one refresh, both stay signed in | T-028 | Web Locks around the refresh; new access tokens, logout and expiry shared over a BroadcastChannel; test: two tabs needing a refresh make one call and both stay signed in, and without Web Locks both still stay signed in; checked in a browser: signing in in one tab signs in the other (#24) | ☑ |
| X-04 | Total balance correct with >10 accounts | T-040 | Dashboard test with 13 accounts: total ETB 11,945.50 "Across 13 accounts"; API test with 120 accounts over three pages (#29) | ☑ |
| X-05 | Money math in cents; no float drift | T-016 | Branded `Cents` type; sums, comparisons and input parsing in integer cents; tests show 0.1 + 0.2 = 30 cents and exact round-trips up to ETB 1,000,000,000 (#15) | ☑ |
| X-06 | Mock mode runs the full app offline | T-005 | MSW mock of every endpoint, used by all tests (`onUnhandledRequest: "error"`) and by the app when `NEXT_PUBLIC_API_MOCKING=on`; 26 contract tests; confirmed in Chrome: "[MSW] Mocking enabled." and demo login answered by the mock with 200 (#5) | ☑ |
| X-07 | Session inspector ("expire token now") behind a flag | T-029 | Session inspector behind NEXT_PUBLIC_DEV_TOOLS (loaded only when on): token countdowns, refresh count, "Expire access token now", one or three calls, "Expire refresh token too"; tested; in a browser, three calls after expiring made one refresh (#25) | ☑ |
| X-08 | No theme flash on first paint | T-012 | Inline `<head>` script applies the stored theme before first paint (#11). Production build: OS light + stored dark loads dark, console empty | ☑ |
| X-09 | Query cache cleared on logout / refresh failure | T-027 | The query cache (and toasts) are cleared whenever a session ends: logout, logout in another tab, or a rejected refresh token; tested (#23) | ☑ |
| X-10 | CSP + security headers; `noindex` | T-094 | Nonce-based CSP from the proxy (scripts need the nonce, connect only to self and the API, no framing) plus nosniff, Referrer-Policy, Permissions-Policy, HSTS, COOP; noindex meta, X-Robots-Tag and robots.txt (ADR-0010). Production build: injected handler and cross-origin fetch blocked, sign-in and theme script work with no violations (#49) | ☑ |
| X-11 | Fidelity report (ours vs spec, both themes, web + mobile) | T-095 |  | ☐ |
| X-12 | Lighthouse ≥ 90 on perf / a11y / best practices | T-096 |  | ☐ |
| X-13 | Focus moves to page heading on route change; dialogs trap and restore focus | T-091 | Dialogs trap focus and return it to the trigger on close; tested (#14). After a client-side navigation focus moves to the new page's h1 (`RouteFocus`), Next's route announcer reads the unique page title, and a skip link comes first in the tab order; tested and checked in a browser (#27) | ☑ |
| X-14 | `prefers-reduced-motion` respected | T-091 |  | ☐ |
| X-15 | Long values don't break layout (long biller, long note, ETB 1,000,000,000.00) | T-092 |  | ☐ |

## I. Release checklist

Run top to bottom on the final build. Anything unticked goes into the README's "Known limitations".

**Works**

- ☐ Every R-row above ticked with evidence
- ☐ Full flow on the live URL with a fresh registered user and with `demo.jane`
- ☐ Left open >10 min: refresh happens silently (check network tab)
- ☐ Refresh token removed by hand → next call lands on login with "session expired"

**Code**

- ☐ `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm test`, `pnpm e2e` all green in CI
- ☐ No `any`, no unneeded `as` casts, no `@ts-ignore`
- ☐ No `console.log`, no dead or commented-out code, no unused deps
- ☐ No component calls `fetch`
- ☐ Each `"use client"` is there for a reason
- ☐ No abstraction without a second use

**UX states** (every data screen)

- ☐ Loading looks intentional (skeleton matches final layout, no CLS)
- ☐ Empty looks intentional
- ☐ Error has a retry
- ☐ Offline shows the network message
- ☐ Double-click on submit sends one request

**Accessibility**

- ☐ Keyboard only: login → transfer → receipt → logout
- ☐ Screen reader (NVDA) reads field errors and toasts
- ☐ axe: zero violations in both themes
- ☐ Buttons are `<button>`, links are `<a>`, one `<h1>` per page, landmarks present
- ☐ Information never by colour alone (+/− signs, "Money in/out" labels)

**Responsive**

- ☐ 360, 390, 768, 1024, 1440 px — no horizontal scroll, touch targets ≥ 44 px

**Security**

- ☐ No secrets committed; `.env*` ignored except `.env.example`
- ☐ Access token never written to storage
- ☐ Raw backend messages never rendered

**Repo**

- ☐ README complete, deploy URL works
- ☐ Commits follow conventional format; no "wip"/"fix2"
- ☐ CHANGELOG + `v1.0.0` tag
- ☐ Third-party challenge material (brief, spec PDF, screens) not in git
- ☐ Every ADR in `docs/decisions/` still matches the code
