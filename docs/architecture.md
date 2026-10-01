# Architecture

## Overview

A Next.js 16 (App Router) web client for the Kifiya banking API. The browser calls the API directly (CORS-enabled) with a bearer token. Server state is managed by TanStack Query; UI state stays local or in the URL.

Key decisions are recorded in [decisions/](decisions/README.md).

## Rendering model

The API authenticates with bearer tokens held in the browser, so the Next.js server never has the user's token. Pages that show user data are therefore **Client Components** that fetch through TanStack Query. Server Components handle what doesn't need the token: the root layout, fonts (`next/font`), metadata, the static panels on the auth pages, and theme bootstrapping. ([ADR-0002](decisions/0002-client-rendered-authenticated-pages.md))

Route protection is layered:

1. `proxy.ts` — optimistic redirect based on a non-sensitive `has_session` cookie (it contains no token). Prevents a flash of the wrong page.
2. Client guard — no refresh token → `/login`. This is the real check in the client.
3. The API — the final authority on every request.

## API layer

```
UI component ─► feature hook (useAccounts, useTransfer…) ─► TanStack Query
                                                         └► feature api (accountsApi.list…)
                                                              └► shared/api/http-client  (only module that calls fetch)
                                                                    ├─ adds Authorization header
                                                                    ├─ timeout + AbortSignal
                                                                    ├─ parses ErrorResponse → ApiError { code, status }
                                                                    └─ on 401 → refreshSession()  (single-flight, cross-tab lock)
                                                                          ├─ success → store both tokens → retry once
                                                                          └─ failure → clear session → /login?reason=expired
```

- Types are generated from [api/openapi.json](api/openapi.json) with `openapi-typescript` into `src/shared/api/schema.ts` (`pnpm api:types`; CI checks it is current with `pnpm api:types:check`). `src/shared/api/types.ts` gives them readable names (`Account`, `Transaction`, `Page<T>` …) and is the only module that imports the generated file. `pnpm api:snapshot` refreshes the OpenAPI copy from the live API.
- `ApiError` is a typed class. `getErrorMessage(error, context)` maps API codes to user copy ([api-notes.md](api-notes.md)). Unknown codes get a generic message. The server's `message` field is never rendered.
- Responses for auth and money are validated with zod at the boundary, so malformed data fails in one place.
- A lint rule forbids `fetch` outside `shared/api`.

## Authentication and token refresh

```
Tab A request ──401──┐
Tab A request ──401──┼─► refreshSession() ── one shared promise per tab
Tab A request ──401──┘          │
                                ▼
                 navigator.locks.request("kifiya-refresh")   ← one refresh across all tabs
                                │
                 refresh token in storage changed since we read it?
                     ├─ yes → another tab already rotated it → reuse new tokens
                     └─ no  → POST /api/auth/refresh-token
                                 ├─ 200 → save access (memory) + refresh (storage) → retry each request once
                                 └─ 401 → clear session + query cache → /login?reason=expired
```

- Refresh is reactive (on 401), as the API documentation describes. ([ADR-0005](decisions/0005-token-refresh-strategy.md))
- A 401 from `/auth/login` or `/auth/refresh-token` never triggers a refresh.
- Other tabs pick up new tokens and logouts through the `storage` event.

### Token storage ([ADR-0003](decisions/0003-token-storage.md))

| Token           | Where          | Why                                           |
| --------------- | -------------- | --------------------------------------------- |
| Access (10 min) | Memory only    | Not persisted, not readable after reload      |
| Refresh (24 h)  | `localStorage` | Must survive reload and be shared across tabs |

Trade-off: a successful XSS could read the refresh token. Mitigations: strict CSP, no `dangerouslySetInnerHTML`, no third-party scripts, React escaping, token rotation. For production we would put a backend-for-frontend (Next route handlers) in front of the API and keep both tokens in `HttpOnly; Secure; SameSite=Strict` cookies, with CSRF protection on mutations.

## State

([ADR-0004](decisions/0004-state-management.md))

| Kind         | Where                          | Examples                                                                              |
| ------------ | ------------------------------ | ------------------------------------------------------------------------------------- |
| Server state | TanStack Query                 | user, accounts, transactions, receipts                                                |
| URL state    | search params                  | Activity `account` + `direction`, open transaction `?tx=`, preselected `from` account |
| Session      | small external store + context | tokens, status `unknown / authenticated / anonymous`                                  |
| Preferences  | `localStorage` behind a hook   | theme override, hide balances                                                         |
| Forms        | react-hook-form + zod          | every form                                                                            |

Cache updates after mutations:

| Mutation                | Invalidates                                                                           |
| ----------------------- | ------------------------------------------------------------------------------------- |
| Open account            | `accounts`                                                                            |
| Transfer                | `accounts`, `transactions(from)`, `transactions(to)` when it's the user's own account |
| Pay bill                | `accounts`, `transactions(account)`                                                   |
| Logout / failed refresh | everything (`queryClient.clear()`) so no data survives into the next session          |

## Money and dates

([ADR-0007](decisions/0007-money-and-dates.md))

- Money is handled in integer cents and formatted once (`ETB 2,200.00`, signed `+ETB` / `−ETB`, tabular figures).
- API timestamps are UTC without an offset; `parseApiDate()` treats them as UTC. Grouping into Today / Yesterday / date uses the user's local time zone.

## Receipts

The transfer and bill-payment responses don't include a transaction id, date or resulting balance. After a successful payment the client finds the new transaction in the source account's history and routes to `/transfer/receipt/[txId]` (or `/pay-bill/receipt/[txId]`), which loads it by id. Receipts therefore survive a reload. ([ADR-0008](decisions/0008-receipt-resolution.md))

## Theming

`scripts/generate-tokens.mts` (`pnpm tokens`) turns [design/design-tokens.json](design/design-tokens.json) into `src/shared/theme/tokens.css`: CSS custom properties (light on `:root`; dark on `[data-theme="dark"]`, or by OS preference unless light is forced) and a Tailwind v4 `@theme` block, so components use token names (`bg-surface`, `text-ink-muted`, `rounded-card`, `h-control`, `type-heading`, `bg-balance`). Tailwind's default palette is removed, sizes and type are in rem, and CI fails if the generated file is stale (`pnpm tokens:check`). An inline script sets `data-theme` before first paint from the stored choice (`system | light | dark`), so there's no theme flash. ([ADR-0006](decisions/0006-design-tokens-pipeline.md))

Tokens are used as given, with one documented override (dark `onPrimary` → white, [N-001](spec-notes.md)). `scripts/design-contrast.test.ts` measures WCAG contrast for every colour pair the screens use; pairs the spec's own tokens fail are pinned as known limitations ([N-016](spec-notes.md)).

## Mock mode

MSW handlers in `src/mocks/` implement the API contract (token rotation, expiry, pagination, error codes). The same handlers serve the app when `NEXT_PUBLIC_API_MOCKING=on`, the Vitest suite, and Playwright in CI, so tests never load the shared API. ([ADR-0009](decisions/0009-mock-mode.md))

| File                     | Role                                                                                                                 |
| ------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `db.ts`, `fixtures.ts`   | In-memory bank (money in cents) and seed data: `demo.jane`, `demo.john`, `demo.empty`                                |
| `tokens.ts`              | JWT-shaped access (10 min) and refresh (24 h) tokens; refresh rotates both; test controls to expire them             |
| `http.ts`, `state.ts`    | API-shaped errors and timestamps, pagination, auth and ownership checks                                              |
| `handlers/`              | One MSW handler per endpoint; assumptions where the API description is silent are listed at the top of `accounts.ts` |
| `node.ts` / `browser.ts` | MSW server for tests / service worker for the browser                                                                |
| `mock-api-provider.tsx`  | Starts the worker before the app renders; if it can't start, shows an error instead of falling back to the real API  |

In tests, `src/test/setup.ts` fails any request the mock doesn't handle and resets the mock bank after each test.

## Folder structure

Feature (domain) folders. `app/` only holds routes; route files compose feature components.

```
src/
├─ app/                          # routing only
│  ├─ layout.tsx                 # fonts, theme bootstrap, providers
│  ├─ not-found.tsx · global-error.tsx
│  ├─ (auth)/                    # public, split-screen layout
│  │  ├─ login/page.tsx
│  │  └─ register/page.tsx
│  └─ (app)/                     # protected: sidebar ≥768 px, bottom nav <768 px
│     ├─ layout.tsx · loading.tsx · error.tsx
│     ├─ page.tsx                # dashboard
│     ├─ accounts/page.tsx
│     ├─ accounts/new/page.tsx
│     ├─ accounts/[accountId]/page.tsx
│     ├─ activity/page.tsx
│     ├─ transfer/page.tsx
│     ├─ transfer/receipt/[txId]/page.tsx
│     ├─ pay-bill/page.tsx
│     ├─ pay-bill/receipt/[txId]/page.tsx
│     └─ profile/page.tsx
├─ features/
│  ├─ auth/          api · session store · token refresh · hooks · components · schemas
│  ├─ accounts/      api · queries · components · account types
│  ├─ transactions/  api · queries · day grouping · components
│  ├─ transfers/     api · mutations · schemas · components
│  ├─ bills/         api · mutations · billers · components
│  ├─ profile/       components
│  └─ dev-tools/     session inspector (behind a flag)
├─ shared/
│  ├─ api/           http client · ApiError · error messages · generated schema + named types
│  ├─ ui/            Button · TextField · AmountField · AccountSelect · Card · ListRow · Dialog/Sheet · Skeleton · EmptyState · Toast · Pill
│  ├─ layout/        Sidebar · BottomNav · PageHeader
│  ├─ lib/           money · dates · account number
│  ├─ theme/         generated tokens.css · theme provider · theme script
│  └─ config/        validated env
├─ mocks/            MSW mock of the API · in-memory bank · demo data
├─ test/             shared test setup (MSW server, cleanup)
└─ proxy.ts
e2e/                 Playwright specs
scripts/             token and API type generation, OpenAPI snapshot
```

Dependencies point one way: `app → features → shared`, with `mocks` depending only on `shared` and reachable from the app only through `MockApiProvider`. ESLint enforces this (`import/no-restricted-paths`), as well as the rule that only `shared/api` calls `fetch`. [src/README.md](../src/README.md) is the short guide for where new code goes.

Unit and component tests sit next to their source as `*.test.ts(x)`. A folder only exists once it has a file; there are no service/repository layers without a second use.

## Tech stack

| Concern                | Choice                                                           | Runner-up           |
| ---------------------- | ---------------------------------------------------------------- | ------------------- |
| Framework              | Next.js 16 App Router, React 19, TypeScript strict               | Vite + React Router |
| Styling                | Tailwind v4, `@theme` fed by generated token CSS                 | CSS Modules         |
| Accessible primitives  | Radix UI (Dialog, Select, RadioGroup, Toast), styled to the spec | shadcn/ui           |
| Server state           | TanStack Query v5                                                | SWR                 |
| Forms                  | react-hook-form + zod                                            | —                   |
| Icons                  | lucide-react (outline)                                           | Heroicons           |
| Unit / component tests | Vitest, React Testing Library, MSW                               | Jest                |
| E2E + accessibility    | Playwright + @axe-core/playwright                                | Cypress             |
| Lint / format          | ESLint (Next config) + Prettier, `tsc --noEmit`                  | Biome               |
| CI / hosting           | GitHub Actions, Vercel                                           | Netlify             |
