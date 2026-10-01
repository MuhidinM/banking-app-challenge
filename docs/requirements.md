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
| R-API-01 | Base URL from env; `.env.example` committed | T-004 |  | ☐ |
| R-API-02 | All calls async and handle network errors (offline, timeout, DNS) | T-020 |  | ☐ |
| R-API-03 | Single typed API client; components never call `fetch` (lint rule `no-restricted-globals` outside `shared/api`) | T-020, T-003 | Lint ban on `fetch` outside `src/shared/api` (#3); typed client pending (T-020) | ◐ |
| R-API-04 | Store access + refresh tokens | T-022 |  | ☐ |
| R-API-05 | `Authorization: Bearer` on protected calls | T-020 |  | ☐ |
| R-API-06 | On 401 → `POST /api/auth/refresh-token` → replace **both** tokens → retry original **once** | T-021 |  | ☐ |
| R-API-07 | Concurrent 401s trigger **one** refresh (unit test) | T-021 |  | ☐ |
| R-API-08 | Refresh fails → clear session → login | T-021, T-025 |  | ☐ |
| R-API-09 | Transfer `note` optional, max 140 chars, becomes description | T-060 |  | ☐ |
| R-API-10 | `balanceAfter` shown when present, handled when missing | T-052 |  | ☐ |
| R-API-11 | Error codes → friendly messages (ACC_002, ACC_004, AUTH_003, VAL_001 + all others in API-NOTES) | T-023 |  | ☐ |

## C. Authentication and registration (Req 2)

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-AUTH-01 | Login: username + password → `POST /api/auth/login` → store tokens → dashboard | T-024 |  | ☐ |
| R-AUTH-02 | Friendly message on invalid credentials | T-024 |  | ☐ |
| R-AUTH-03 | Register: username, password, first, last, email (optional), phone; client validation | T-026 |  | ☐ |
| R-AUTH-04 | Register calls `POST /api/auth/register`; then auto-login **or** login with confirmation | T-026 |  | ☐ |
| R-AUTH-05 | Duplicate username / email errors shown on the right field | T-026 |  | ☐ |
| R-AUTH-06 | Protected pages unreachable without a session | T-025 |  | ☐ |
| R-AUTH-07 | Valid session skips the login page | T-025 |  | ☐ |
| R-AUTH-08 | Session survives page reload | T-022 |  | ☐ |
| R-AUTH-09 | Logout clears the session (tokens + query cache) | T-027 |  | ☐ |

## D. Main flow (Req 3)

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-FLOW-01 | Dashboard greeting from `GET /api/users/me` | T-040 |  | ☐ |
| R-FLOW-02 | Total balance across **all** accounts | T-040 |  | ☐ |
| R-FLOW-03 | Accounts list (`GET /api/accounts`, paginated): number, type, balance | T-041 |  | ☐ |
| R-FLOW-04 | Recent transactions of one account on dashboard | T-040 |  | ☐ |
| R-FLOW-05 | Navigation to all other screens | T-030 |  | ☐ |
| R-FLOW-06 | Create account: type + optional initial balance → `POST /api/accounts` | T-042 |  | ☐ |
| R-FLOW-07 | New account appears without full reload | T-042 |  | ☐ |
| R-FLOW-08 | Transfer: from (own accounts), recipient number, amount, optional note | T-060 |  | ☐ |
| R-FLOW-09 | Review step showing details + "cannot be reversed" warning before calling API | T-061 |  | ☐ |
| R-FLOW-10 | Confirmation screen with receipt: amount, recipient, new balance, reference (not just a toast) | T-062 |  | ☐ |
| R-FLOW-11 | Specific errors: "Insufficient funds", "Cannot transfer to the same account", "Account not found" | T-063 |  | ☐ |
| R-FLOW-12 | Bill payment: from account, biller, amount → `POST /api/accounts/pay-bill` | T-070 |  | ☐ |
| R-FLOW-13 | History per account `GET /api/transactions/{accountId}`, Load more or infinite scroll | T-050 |  | ☐ |
| R-FLOW-14 | Row shows amount, type, direction, timestamp, description | T-051 |  | ☐ |
| R-FLOW-15 | Filter All / Money in (CREDIT) / Money out (DEBIT) | T-053 |  | ☐ |
| R-FLOW-16 | Rows grouped by day: Today, Yesterday, date | T-051 |  | ☐ |
| R-FLOW-17 | Row → detail: type, direction, reference, counterparty, balanceAfter if present | T-052 |  | ☐ |
| R-FLOW-18 | After transfer / bill / new account, balances and history refresh automatically | T-064 |  | ☐ |

## E. UX, accessibility, errors (Req 4)

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-UX-01 | Follows the design spec (layout, hierarchy, spacing, colour, type) | all UI | fidelity report | ☐ |
| R-UX-02 | Light + dark theme; follows OS; user override | T-012 |  | ☐ |
| R-UX-03 | Desktop layout (sidebar) + mobile layout (bottom nav) below 768 px | T-030 |  | ☐ |
| R-UX-04 | Skeletons/spinners while loading | T-014 |  | ☐ |
| R-UX-05 | Submit buttons disabled while submitting; no double submit | T-013 |  | ☐ |
| R-UX-06 | Empty states: no accounts, no transactions | T-014 |  | ☐ |
| R-UX-07 | Errors from API code + generic network message; **never raw backend text** | T-023 |  | ☐ |
| R-UX-08 | Validation before send: positive amounts, 10-digit account numbers, required fields | T-060, T-070 |  | ☐ |
| R-UX-09 | Labelled fields | T-013 | axe | ☐ |
| R-UX-10 | Keyboard navigation | T-091 |  | ☐ |
| R-UX-11 | Visible focus (spec: 3px accent-soft + accent border on controls; 2px accent offset 2 on buttons/links) | T-011 |  | ☐ |
| R-UX-12 | Sufficient contrast (WCAG AA, both themes) | T-091 | axe | ☐ |
| R-UX-13 | `aria-live` for toasts and inline errors | T-015 |  | ☐ |
| R-UX-14 | Usable 360 → 1440 px | T-092 |  | ☐ |

## F. Code quality and testing (Req 5)

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-CQ-01 | Feature/domain folders | T-002 |  | ☐ |
| R-CQ-02 | Typed API models, no `any` (lint: `no-explicit-any` as error) | T-003, T-020 | `no-explicit-any` + `no-non-null-assertion` as errors (#3); typed models pending (T-008, T-020) | ◐ |
| R-CQ-03 | Small components, custom hooks, composition over prop drilling | all | review | ☐ |
| R-CQ-04 | Clear server-state vs UI-state split | ADR-0004 |  | ☐ |
| R-CQ-05 | ESLint + Prettier configured and passing | T-003 | `pnpm lint` (zero warnings) and `pnpm format:check` pass; pre-commit hook (#3); CI pending (T-006) | ◐ |
| R-CQ-06 | Unit tests: API client | T-020 |  | ☐ |
| R-CQ-07 | Unit tests: refresh logic incl. many concurrent 401s → one refresh | T-021 |  | ☐ |
| R-CQ-08 | ≥1 component test (RTL) | T-024 |  | ☐ |
| R-CQ-09 | E2E tests (plus) | T-093 |  | ☐ |
| R-CQ-10 | `.env.example` committed | T-004 |  | ☐ |

## G. Submission

| ID | Requirement | Task | Evidence | ✓ |
|---|---|---|---|---|
| R-SUB-01 | Public repo on personal GitHub | T-100 |  | ☐ |
| R-SUB-02 | Live deployment URL in README (plus) | T-101 |  | ☐ |
| R-SUB-03 | README: setup, env vars, features, architecture (esp. auth/refresh), assumptions, trade-offs | T-102 |  | ☐ |
| R-SUB-04 | README shows security trade-offs (httpOnly cookies via BFF) | T-102 |  | ☐ |
| R-SUB-05 | Submitted within 3 days | T-103 |  | ☐ |

## H. Additional quality criteria (beyond the brief)

| ID | Item | Task | ✓ |
|---|---|---|---|
| X-01 | Receipt route survives reload (`/transfer/receipt/[txId]`) | T-062 | ☐ |
| X-02 | UTC timestamps parsed correctly; day grouping test at midnight boundary | T-016 | ☐ |
| X-03 | Cross-tab refresh: two tabs, one refresh, both stay signed in | T-028 | ☐ |
| X-04 | Total balance correct with >10 accounts | T-040 | ☐ |
| X-05 | Money math in cents; no float drift | T-016 | ☐ |
| X-06 | Mock mode runs the full app offline | T-005 | ☐ |
| X-07 | Session inspector ("expire token now") behind a flag | T-029 | ☐ |
| X-08 | No theme flash on first paint | T-012 | ☐ |
| X-09 | Query cache cleared on logout / refresh failure | T-027 | ☐ |
| X-10 | CSP + security headers; `noindex` | T-094 | ☐ |
| X-11 | Fidelity report (ours vs spec, both themes, web + mobile) | T-095 | ☐ |
| X-12 | Lighthouse ≥ 90 on perf / a11y / best practices | T-096 | ☐ |
| X-13 | Focus moves to page heading on route change; dialogs trap and restore focus | T-091 | ☐ |
| X-14 | `prefers-reduced-motion` respected | T-091 | ☐ |
| X-15 | Long values don't break layout (long biller, long note, ETB 1,000,000,000.00) | T-092 | ☐ |

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
