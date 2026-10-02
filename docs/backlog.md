# Backlog

Status: `todo` · `doing` · `review` · `done` · `cut`. Each task has a GitHub issue (the backlog ID is in the issue body) and is closed by a pull request. Progress is tracked on the [project board](https://github.com/users/MuhidinM/projects/2).
Reqs refer to [requirements.md](requirements.md). Size: S < 1 h · M 1–3 h · L > 3 h.

## M0 — Setup

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-001 | [#1](https://github.com/MuhidinM/banking-app-challenge/issues/1) | Confirm TS strict, React 19, Next 16; move `app/` to `src/app`, `@/*` → `src/*` | R-TS-01/02 | S | done |
| T-002 | [#2](https://github.com/MuhidinM/banking-app-challenge/issues/2) | Create the folder structure from architecture.md (only folders that get files) | R-CQ-01 | S | done |
| T-003 | [#3](https://github.com/MuhidinM/banking-app-challenge/issues/3) | ESLint rules (`no-explicit-any`, no `fetch` outside `shared/api`, react-hooks, jsx-a11y), Prettier, `typecheck` script, lint-staged + husky pre-commit | R-CQ-05, R-API-03 | M | done |
| T-004 | [#4](https://github.com/MuhidinM/banking-app-challenge/issues/4) | `env.ts` validated with zod; `.env.example` (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_MOCKING`, `NEXT_PUBLIC_DEV_TOOLS`) | R-API-01, R-CQ-10 | S | done |
| T-005 | [#5](https://github.com/MuhidinM/banking-app-challenge/issues/5) | MSW setup (browser + node), fixtures modelled on demo users, error scenarios | X-06 | M | done |
| T-006 | [#6](https://github.com/MuhidinM/banking-app-challenge/issues/6) | GitHub Actions CI: install, typecheck, lint, format, unit; later E2E | R-CQ-05 | M | done |
| T-007 | [#7](https://github.com/MuhidinM/banking-app-challenge/issues/7) | Pull request and issue templates (task, bug); issues, labels, milestones and project board created from this file | — | S | done |
| T-008 | [#8](https://github.com/MuhidinM/banking-app-challenge/issues/8) | Generate API types from `docs/api/openapi.json` (`openapi-typescript`), script `api:types` | R-CQ-02 | S | done |
| T-009 | [#58](https://github.com/MuhidinM/banking-app-challenge/issues/58) | Vitest + React Testing Library + jest-dom setup, `test` scripts, first tests for env parsing (added while working on #4: no task set up the test runner) | R-CQ-06/07/08 | S | done |

## M1 — Foundation

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-010 | [#9](https://github.com/MuhidinM/banking-app-challenge/issues/9) | `scripts/generate-tokens.mts`: design-tokens.json → `tokens.css` (light `:root`, dark `[data-theme=dark]`) + Tailwind `@theme` | R-UX-01 | M | done |
| T-011 | [#10](https://github.com/MuhidinM/banking-app-challenge/issues/10) | Fonts via `next/font` (Montserrat text, Raleway headings), type scale utilities, focus ring utilities, tabular nums | R-UX-01/11 | S | done |
| T-012 | [#11](https://github.com/MuhidinM/banking-app-challenge/issues/11) | Theme: system / light / dark, inline script before paint (no flash), toggle in sidebar + profile | R-UX-02, X-08 | M | done |
| T-013 | [#12](https://github.com/MuhidinM/banking-app-challenge/issues/12) | UI primitives: Button (primary, soft, outline, ghost, danger, loading, compact), TextField (icon, error, hint, disabled), AmountField (ETB prefix, chips), Select, RadioCard | R-UX-05/09 | L | done |
| T-014 | [#13](https://github.com/MuhidinM/banking-app-challenge/issues/13) | Card, ListRow, Skeleton, EmptyState, ErrorState with retry, Pill/filter tabs, Badge | R-UX-04/06 | M | done |
| T-015 | [#14](https://github.com/MuhidinM/banking-app-challenge/issues/14) | Dialog (desktop) / Sheet (mobile) on Radix; Toast with `aria-live` | R-UX-13 | M | done |
| T-016 | [#15](https://github.com/MuhidinM/banking-app-challenge/issues/15) | `money.ts` (cents, parse, format, sign), `dates.ts` (UTC parse, local day groups, relative labels), `account-number.ts` (mask, group 4-4-2, validate 10 digits) + unit tests | X-02, X-05 | M | done |

## M2 — API and auth

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-020 | [#16](https://github.com/MuhidinM/banking-app-challenge/issues/16) | `http-client.ts`: base URL, JSON, bearer, timeout + abort, `ApiError` normalisation, network error type; unit tests | R-API-02/03/05, R-CQ-06 | M | done |
| T-021 | [#17](https://github.com/MuhidinM/banking-app-challenge/issues/17) | Refresh: on 401 single-flight refresh, rotate both tokens, retry once, no loop on refresh endpoint, failure → session cleared; tests incl. 5 concurrent 401s → 1 refresh | R-API-06/07/08, R-CQ-07 | M | done |
| T-022 | [#18](https://github.com/MuhidinM/banking-app-challenge/issues/18) | Session store: access in memory, refresh in localStorage, status machine, `has_session` cookie hint; reload restores via refresh | R-API-04, R-AUTH-08 | M | done |
| T-023 | [#19](https://github.com/MuhidinM/banking-app-challenge/issues/19) | `error-messages.ts`: every API code → copy, per context (login, register, transfer, bill); field-level mapping | R-API-11, R-UX-07 | S | done |
| T-024 | [#20](https://github.com/MuhidinM/banking-app-challenge/issues/20) | Login page (split layout web, mobile layout), password reveal, "session expired" banner from `?reason=expired`; component test | R-AUTH-01/02, R-CQ-08 | M | done |
| T-025 | [#21](https://github.com/MuhidinM/banking-app-challenge/issues/21) | Route protection: `proxy.ts` optimistic redirect + client guard; logged-in users bounced from /login; `?next=` return path (validated, same-origin only) | R-AUTH-06/07 | M | done |
| T-026 | [#22](https://github.com/MuhidinM/banking-app-challenge/issues/22) | Register page: zod schema mirroring API (username 3–50, password ≥6, phone pattern), confirm password, AUTH_003/004 on fields, auto-login after success | R-AUTH-03/04/05 | M | done |
| T-027 | [#23](https://github.com/MuhidinM/banking-app-challenge/issues/23) | Logout: clear tokens, cookie, `queryClient.clear()`, broadcast to other tabs | R-AUTH-09, X-09 | S | done |
| T-028 | [#24](https://github.com/MuhidinM/banking-app-challenge/issues/24) | Cross-tab: Web Locks around refresh, storage event to share new tokens and logout; test | X-03 | M | done |
| T-029 | [#25](https://github.com/MuhidinM/banking-app-challenge/issues/25) | Session inspector (flag): token expiry countdown, refresh count, "expire access token now" | X-07 | S | done |

## M3 — App shell

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-030 | [#26](https://github.com/MuhidinM/banking-app-challenge/issues/26) | `(app)` layout: sidebar 260 px ≥768, bottom nav with centre Transfer action <768, user footer + logout | R-UX-03, R-FLOW-05 | M | done |
| T-031 | [#27](https://github.com/MuhidinM/banking-app-challenge/issues/27) | PageHeader (back button, title, actions), skip link, focus to `<h1>` on navigation | X-13 | S | done |
| T-032 | [#28](https://github.com/MuhidinM/banking-app-challenge/issues/28) | `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx` in design language | R-UX-04/07 | S | done |

## M4 — Accounts and dashboard

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-040 | [#29](https://github.com/MuhidinM/banking-app-challenge/issues/29) | Dashboard: greeting (time of day + first name), total balance card (gradient, hide toggle), quick actions, my accounts, recent activity of first account | R-FLOW-01/02/04, X-04 | L | done |
| T-041 | [#30](https://github.com/MuhidinM/banking-app-challenge/issues/30) | Accounts page: list with count + total, "Open another account" row, empty state | R-FLOW-03, R-UX-06 | M | done |
| T-042 | [#31](https://github.com/MuhidinM/banking-app-challenge/issues/31) | Open account: radio cards (3 + "more types"), optional deposit, cancel, success → account detail; invalidate accounts | R-FLOW-06/07 | M | done |
| T-043 | [#32](https://github.com/MuhidinM/banking-app-challenge/issues/32) | Account detail: gradient card with full grouped number, Transfer / Pay bill shortcuts (pre-select account), activity list | R-FLOW-13 | M | done |

## M5 — Transactions

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-050 | [#33](https://github.com/MuhidinM/banking-app-challenge/issues/33) | `useTransactions(accountId)` infinite query, Load more + "Showing x of y" | R-FLOW-13 | M | done |
| T-051 | [#34](https://github.com/MuhidinM/banking-app-challenge/issues/34) | TransactionRow (icon per type, title, meta "Type · time", signed amount colour + sign) and day grouping | R-FLOW-14/16 | M | done |
| T-052 | [#35](https://github.com/MuhidinM/banking-app-challenge/issues/35) | Detail dialog (web) / sheet (mobile) via `?tx=`; balanceAfter only when present; share receipt | R-FLOW-17, R-API-10 | M | done |
| T-053 | [#36](https://github.com/MuhidinM/banking-app-challenge/issues/36) | Direction filter in URL (`?direction=CREDIT`), account selector on Activity page | R-FLOW-15 | S | done |

## M6 — Transfer

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-060 | [#37](https://github.com/MuhidinM/banking-app-challenge/issues/37) | Transfer form: from select (with available balance), recipient (format `2899 0108 46`, 10 digits), amount + chips + Max, note ≤140 with counter; summary card on web | R-FLOW-08, R-API-09, R-UX-08 | L | done |
| T-061 | [#38](https://github.com/MuhidinM/banking-app-challenge/issues/38) | Review dialog/sheet with irreversible warning, Confirm and send, Edit details | R-FLOW-09 | M | done |
| T-062 | [#39](https://github.com/MuhidinM/banking-app-challenge/issues/39) | Receipt route `/transfer/receipt/[txId]`: resolve tx after transfer, show amount, recipient, date, reference, new balance; share + Done | R-FLOW-10, X-01 | M | done |
| T-063 | [#40](https://github.com/MuhidinM/banking-app-challenge/issues/40) | Error mapping: ACC_002 on amount, ACC_003 + ACC_001 on recipient, ACC_004, TXN_001, network | R-FLOW-11 | S | done |
| T-064 | [#41](https://github.com/MuhidinM/banking-app-challenge/issues/41) | Invalidation after mutations (accounts, both accounts' transactions) + test | R-FLOW-18 | S | todo |

## M7 — Bills

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-070 | [#42](https://github.com/MuhidinM/banking-app-challenge/issues/42) | Pay bill form: from, biller select (list + Other), amount + chips, live insufficient-funds check, summary card | R-FLOW-12, R-UX-08 | M | done |
| T-071 | [#43](https://github.com/MuhidinM/banking-app-challenge/issues/43) | Bill receipt `/pay-bill/receipt/[txId]` + invalidation | R-FLOW-18 | S | todo |

## M8 — Profile

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-080 | [#44](https://github.com/MuhidinM/banking-app-challenge/issues/44) | Profile: user card, total across accounts, theme setting, change password (disabled, see N-004), logout | R-AUTH-09 | S | done |

## M9 — Quality

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-090 | [#45](https://github.com/MuhidinM/banking-app-challenge/issues/45) | Extras: hide balances, copy account number, share/print receipt, recent recipients, offline banner, CSV export | — | M | todo |
| T-091 | [#46](https://github.com/MuhidinM/banking-app-challenge/issues/46) | Accessibility pass: keyboard walkthrough, NVDA, focus management, reduced motion, contrast | R-UX-10/11/12, X-13/14 | M | todo |
| T-092 | [#47](https://github.com/MuhidinM/banking-app-challenge/issues/47) | Responsive pass at 360/390/768/1024/1440; long-value stress | R-UX-14, X-15 | M | todo |
| T-093 | [#48](https://github.com/MuhidinM/banking-app-challenge/issues/48) | Playwright on a mock-mode build in CI: sign-in, register, route protection, session restore, logout, two tabs; CSP and request guard; axe on every page | R-CQ-09 | L | done |
| T-104 | [#94](https://github.com/MuhidinM/banking-app-challenge/issues/94) | Playwright: token refresh, transfer happy + errors, bill, open account, history filters; axe on new pages; live smoke locally | R-CQ-09 | M | todo |
| T-094 | [#49](https://github.com/MuhidinM/banking-app-challenge/issues/49) | Security headers + CSP in `next.config.ts`, `robots: noindex`, `?next=` validation review | X-10 | S | done |
| T-095 | [#50](https://github.com/MuhidinM/banking-app-challenge/issues/50) | Fidelity report `docs/fidelity.md` (screenshots vs spec, both themes) | X-11 | M | todo |
| T-096 | [#51](https://github.com/MuhidinM/banking-app-challenge/issues/51) | Lighthouse check, fix findings | X-12 | S | todo |

## M10 — Release

| ID | Issue | Task | Reqs | Size | Status |
|---|---|---|---|---|---|
| T-100 | — | Push to personal GitHub (public) | R-SUB-01 | S | done |
| T-101 | [#52](https://github.com/MuhidinM/banking-app-challenge/issues/52) | Vercel deploy, env vars, verify CORS on the live URL | R-SUB-02 | S | todo |
| T-102 | [#53](https://github.com/MuhidinM/banking-app-challenge/issues/53) | README: setup, env, features, architecture + refresh sequence diagram, decisions, trade-offs, security, known limitations, AI usage | R-SUB-03/04 | M | todo |
| T-103 | [#54](https://github.com/MuhidinM/banking-app-challenge/issues/54) | Run the full release checklist, CHANGELOG, tag `v1.0.0`, submit link | R-SUB-05 | S | todo |
