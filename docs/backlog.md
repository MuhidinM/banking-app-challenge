# Tasks — backlog

Status: `todo` · `doing` · `review` · `done` · `cut`. Each task becomes a GitHub issue (same ID in the title) and is closed by a PR.
Reqs refer to [requirements.md](requirements.md). Size: S < 1 h · M 1–3 h · L > 3 h.

## M0 — Setup

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-001 | Confirm TS strict, React 19, Next 16; move `app/` to `src/app`, `@/*` → `src/*` | R-TS-01/02 | S | todo |
| T-002 | Create folder skeleton per architecture.md (folder structure) (only folders that get files) | R-CQ-01 | S | todo |
| T-003 | ESLint rules (`no-explicit-any`, no `fetch` outside `shared/api`, react-hooks, jsx-a11y), Prettier, `typecheck` script, lint-staged + husky pre-commit | R-CQ-05, R-API-03 | M | todo |
| T-004 | `env.ts` validated with zod; `.env.example` (`NEXT_PUBLIC_API_BASE_URL`, `NEXT_PUBLIC_API_MOCKING`, `NEXT_PUBLIC_DEV_TOOLS`) | R-API-01, R-CQ-10 | S | todo |
| T-005 | MSW setup (browser + node), fixtures modelled on demo users, error scenarios | X-06 | M | todo |
| T-006 | GitHub Actions CI: install, typecheck, lint, format, unit; later E2E | R-CQ-05 | M | todo |
| T-007 | `.github/` PR template, issue templates (task, bug), CODEOWNERS; create issues + milestones from this file | — | S | todo |
| T-008 | Generate API types from `docs/api/openapi.json` (`openapi-typescript`), script `api:types` | R-CQ-02 | S | todo |

## M1 — Foundation

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-010 | `scripts/generate-tokens.ts`: design-tokens.json → `tokens.css` (light `:root`, dark `[data-theme=dark]`) + Tailwind `@theme` | R-UX-01 | M | todo |
| T-011 | Fonts via `next/font` (Montserrat text, Raleway headings), type scale utilities, focus ring utilities, tabular nums | R-UX-01/11 | S | todo |
| T-012 | Theme: system / light / dark, inline script before paint (no flash), toggle in sidebar + profile | R-UX-02, X-08 | M | todo |
| T-013 | UI primitives: Button (primary, soft, outline, ghost, danger, loading, compact), TextField (icon, error, hint, disabled), AmountField (ETB prefix, chips), Select, RadioCard | R-UX-05/09 | L | todo |
| T-014 | Card, ListRow, Skeleton, EmptyState, ErrorState with retry, Pill/filter tabs, Badge | R-UX-04/06 | M | todo |
| T-015 | Dialog (desktop) / Sheet (mobile) on Radix; Toast with `aria-live` | R-UX-13 | M | todo |
| T-016 | `money.ts` (cents, parse, format, sign), `dates.ts` (UTC parse, local day groups, relative labels), `account-number.ts` (mask, group 4-4-2, validate 10 digits) + unit tests | X-02, X-05 | M | todo |

## M2 — API and auth

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-020 | `http-client.ts`: base URL, JSON, bearer, timeout + abort, `ApiError` normalisation, network error type; unit tests | R-API-02/03/05, R-CQ-06 | M | todo |
| T-021 | Refresh: on 401 single-flight refresh, rotate both tokens, retry once, no loop on refresh endpoint, failure → session cleared; tests incl. 5 concurrent 401s → 1 refresh | R-API-06/07/08, R-CQ-07 | M | todo |
| T-022 | Session store: access in memory, refresh in localStorage, status machine, `has_session` cookie hint; reload restores via refresh | R-API-04, R-AUTH-08 | M | todo |
| T-023 | `error-messages.ts`: every API code → copy, per context (login, register, transfer, bill); field-level mapping | R-API-11, R-UX-07 | S | todo |
| T-024 | Login page (split layout web, mobile layout), password reveal, "session expired" banner from `?reason=expired`; component test | R-AUTH-01/02, R-CQ-08 | M | todo |
| T-025 | Route protection: `proxy.ts` optimistic redirect + client guard; logged-in users bounced from /login; `?next=` return path (validated, same-origin only) | R-AUTH-06/07 | M | todo |
| T-026 | Register page: zod schema mirroring API (username 3–50, password ≥6, phone pattern), confirm password, AUTH_003/004 on fields, auto-login after success | R-AUTH-03/04/05 | M | todo |
| T-027 | Logout: clear tokens, cookie, `queryClient.clear()`, broadcast to other tabs | R-AUTH-09, X-09 | S | todo |
| T-028 | Cross-tab: Web Locks around refresh, storage event to share new tokens and logout; test | X-03 | M | todo |
| T-029 | Session inspector (flag): token expiry countdown, refresh count, "expire access token now" | X-07 | S | todo |

## M3 — App shell

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-030 | `(app)` layout: sidebar 260 px ≥768, bottom nav with centre Transfer action <768, user footer + logout | R-UX-03, R-FLOW-05 | M | todo |
| T-031 | PageHeader (back button, title, actions), skip link, focus to `<h1>` on navigation | X-13 | S | todo |
| T-032 | `loading.tsx`, `error.tsx`, `not-found.tsx`, `global-error.tsx` in design language | R-UX-04/07 | S | todo |

## M4 — Accounts and dashboard

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-040 | Dashboard: greeting (time of day + first name), total balance card (gradient, hide toggle), quick actions, my accounts, recent activity of first account | R-FLOW-01/02/04, X-04 | L | todo |
| T-041 | Accounts page: list with count + total, "Open another account" row, empty state | R-FLOW-03, R-UX-06 | M | todo |
| T-042 | Open account: radio cards (3 + "more types"), optional deposit, cancel, success → account detail; invalidate accounts | R-FLOW-06/07 | M | todo |
| T-043 | Account detail: gradient card with full grouped number, Transfer / Pay bill shortcuts (pre-select account), activity list | R-FLOW-13 | M | todo |

## M5 — Transactions

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-050 | `useTransactions(accountId)` infinite query, Load more + "Showing x of y" | R-FLOW-13 | M | todo |
| T-051 | TransactionRow (icon per type, title, meta "Type · time", signed amount colour + sign) and day grouping | R-FLOW-14/16 | M | todo |
| T-052 | Detail dialog (web) / sheet (mobile) via `?tx=`; balanceAfter only when present; share receipt | R-FLOW-17, R-API-10 | M | todo |
| T-053 | Direction filter in URL (`?direction=CREDIT`), account selector on Activity page | R-FLOW-15 | S | todo |

## M6 — Transfer

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-060 | Transfer form: from select (with available balance), recipient (format `2899 0108 46`, 10 digits), amount + chips + Max, note ≤140 with counter; summary card on web | R-FLOW-08, R-API-09, R-UX-08 | L | todo |
| T-061 | Review dialog/sheet with irreversible warning, Confirm and send, Edit details | R-FLOW-09 | M | todo |
| T-062 | Receipt route `/transfer/receipt/[txId]`: resolve tx after transfer, show amount, recipient, date, reference, new balance; share + Done | R-FLOW-10, X-01 | M | todo |
| T-063 | Error mapping: ACC_002 on amount, ACC_003 + ACC_001 on recipient, ACC_004, TXN_001, network | R-FLOW-11 | S | todo |
| T-064 | Invalidation after mutations (accounts, both accounts' transactions) + test | R-FLOW-18 | S | todo |

## M7 — Bills

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-070 | Pay bill form: from, biller select (list + Other), amount + chips, live insufficient-funds check, summary card | R-FLOW-12, R-UX-08 | M | todo |
| T-071 | Bill receipt `/pay-bill/receipt/[txId]` + invalidation | R-FLOW-18 | S | todo |

## M8 — Profile

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-080 | Profile: user card, total across accounts, theme setting, change password (disabled, see N-004), logout | R-AUTH-09 | S | todo |

## M9 — Quality

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-090 | Extras: hide balances, copy account number, share/print receipt, recent recipients, offline banner, CSV export | — | M | todo |
| T-091 | Accessibility pass: keyboard walkthrough, NVDA, focus management, reduced motion, contrast | R-UX-10/11/12, X-13/14 | M | todo |
| T-092 | Responsive pass at 360/390/768/1024/1440; long-value stress | R-UX-14, X-15 | M | todo |
| T-093 | Playwright: auth + refresh, transfer happy + errors, bill, open account, filters; axe on every page; mocked in CI + live smoke locally | R-CQ-09 | L | todo |
| T-094 | Security headers + CSP in `next.config.ts`, `robots: noindex`, `?next=` validation review | X-10 | S | todo |
| T-095 | Fidelity report `docs/fidelity.md` (screenshots vs spec, both themes) | X-11 | M | todo |
| T-096 | Lighthouse check, fix findings | X-12 | S | todo |

## M10 — Release

| ID | Task | Reqs | Size | Status |
|---|---|---|---|---|
| T-100 | Push to personal GitHub (public) | R-SUB-01 | S | todo |
| T-101 | Vercel deploy, env vars, verify CORS on the live URL | R-SUB-02 | S | todo |
| T-102 | README: setup, env, features, architecture + refresh sequence diagram, decisions, trade-offs, security, known limitations, AI usage | R-SUB-03/04 | M | todo |
| T-103 | Run the full release checklist, CHANGELOG, tag `v1.0.0`, submit link | R-SUB-05 | S | todo |
