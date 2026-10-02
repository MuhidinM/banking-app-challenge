# Kifiya Banking Web Client

[![CI](https://github.com/MuhidinM/banking-app-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/MuhidinM/banking-app-challenge/actions/workflows/ci.yml)

A responsive banking web client for the Kifiya Web Developer Challenge, built with Next.js 16, React 19 and TypeScript against the [challenge banking API](https://challenge-api.qena.dev/scalar). Customers sign in, see their accounts and history, open accounts, send transfers and pay bills, on a phone or a desktop, in light or dark.

**Live:** <https://banking-app-challenge-beta.vercel.app>, deployed on Vercel from `main` against the real API. Sign up there, or sign in with a demo user from the API's documentation. Every pull request also gets its own preview deployment.

The Kifiya name and logo belong to Kifiya and are used here only because the challenge's design uses them. The site asks search engines not to index it, and its footer says it is a reference client for the challenge.

## Contents

- [Getting started](#getting-started)
- [Environment variables](#environment-variables)
- [Features](#features)
- [Architecture](#architecture)
- [Security](#security)
- [Quality](#quality)
- [Assumptions and known limitations](#assumptions-and-known-limitations)
- [How AI was used](#how-ai-was-used)
- [Scripts](#scripts)
- [Documentation](#documentation)

## Getting started

Requires Node.js 24 (see `.nvmrc`) and pnpm 12. Without pnpm, `corepack enable` installs the version pinned in `package.json`.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000> and register, or sign in with an account you already have on the challenge API.

### Run offline with the mock API

Set `NEXT_PUBLIC_API_MOCKING=on` in `.env.local` and restart `pnpm dev`. Every API call is then answered by an in-browser mock ([MSW](https://mswjs.io)) with sample data, and nothing is sent to the shared API. Sign in with the demo users documented by the API: `demo.jane` (two accounts with history), `demo.john` (a transfer recipient) or `demo.empty` (no transactions), all with the password `Password123!`. The mock keeps its data in localStorage, so a reload keeps you signed in and keeps your transfers; clear the site's data to start again from the seed.

### Watch the token refresh

Access tokens last 10 minutes. Set `NEXT_PUBLIC_DEV_TOOLS=on` and restart to get a **Session** button in the bottom-right corner. It shows when both tokens expire and how often this tab has refreshed. **Expire access token now** followed by **3 calls at once** shows three 401s, a single refresh, and three retries that succeed. **Expire refresh token too** shows the session ending and the login page's "session expired" banner. It works with the mock and with the real API, because it only replaces the token this tab holds.

## Environment variables

All three are read in the browser, so they are built into the JavaScript bundle: never put a secret in them. Restart `pnpm dev`, or rebuild, after changing one. They are checked when the app starts (`src/shared/config/env.ts`); a missing or malformed value stops it with a message naming the variable.

| Variable                   | Required | Default | What it does                                                                       |
| -------------------------- | -------- | ------- | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_API_BASE_URL` | yes      | —       | Banking API origin without a trailing slash, e.g. `https://challenge-api.qena.dev` |
| `NEXT_PUBLIC_API_MOCKING`  | no       | `off`   | `on` answers every API call from the in-browser mock, with sample data             |
| `NEXT_PUBLIC_DEV_TOOLS`    | no       | `off`   | `on` shows the session inspector described above                                   |

## Features

Every screen in the brief and the design, each with loading, empty and error states:

- **Sign in and register**, with field errors from the API shown on their fields. A session that expires sends you back to sign in with a "session expired" banner, and then back to the page you were on.
- **Dashboard**: total balance across all accounts, quick actions, your accounts and the latest activity.
- **Accounts**: the list, each account's balance card and history, and opening a new account of any of the API's six types, with an optional first deposit.
- **Activity**: an account's history grouped by day, with Load more, a money in / money out filter and the account picker kept in the URL, so reload, Back and shared links keep them. Each transaction opens in a dialog on desktop and a sheet on phones, also from a link.
- **Transfer**: from, to, amount and note, checked as you type ("Insufficient funds. Available: ETB 8,640.00."). A review step comes before anything is sent. The receipt has its own URL, so it survives a reload. Confirm sends once however fast it is clicked.
- **Pay a bill**: biller, account and amount, with the same checks and a receipt page.
- **Profile**: your details, the total across accounts, the theme and logout.
- **Theme**: System, Light or Dark, applied before the first paint so a reload never flashes the wrong one.
- **Responsive**: a sidebar from 768 px, a bottom bar with a raised Transfer button below that; dialogs become sheets on phones.

### Extras

Small additions beyond the brief, all in the existing design language:

- **Hide balances**: the eye button on the dashboard masks the total balance, and the choice is remembered on this device.
- **Copy account number**: on each account's page, with a confirmation toast; Share sends it through the device's share sheet.
- **Share receipt**: transfer, bill and transaction receipts can be shared, or copied as text where sharing isn't available.
- **Recent recipients**: on Transfer, chips under the account number fill in an account the chosen account sent money to lately, read from its history.
- **Offline banner**: a warning above every page while the connection is down; when it returns, a toast says so and what's on screen refreshes. A transfer confirmed offline fails at once instead of being sent later.
- **CSV export**: Download CSV under an account's history saves the rows loaded so far, with the filter applied, as `kifiya-<account>-<date>.csv`.

## Architecture

The full write-up is [docs/architecture.md](docs/architecture.md); each larger choice has a decision record in [docs/decisions/](docs/decisions/README.md).

- **Rendering**: Next.js App Router. Signed-in pages are client components: the API is called from the browser with a bearer token, so the server has no session to render with ([ADR-0002](docs/decisions/0002-client-rendered-authenticated-pages.md)). A small route proxy (`src/proxy.ts`) only redirects signed-out visitors early; the client is the real check.
- **Folders**: `src/app` holds routes only. `src/features/<domain>` (auth, accounts, transactions, transfers, bills, profile) holds the API calls, queries and components for each domain. `src/shared` holds the HTTP client, UI components, layout, money and date helpers, and theme. Imports go one way, `app → features → shared`, and ESLint enforces it.
- **API layer**: one HTTP client (`src/shared/api/http-client.ts`) adds the token, refreshes it, and turns every failure into an `ApiError` (with the API's error code) or a `NetworkError` (offline, timeout, unreachable). Error codes map to plain messages; the server's own message text is never shown. Types are generated from the API's OpenAPI document.
- **State**: TanStack Query for everything from the API, the URL for filters and open dialogs, React state for forms. There is no global store ([ADR-0004](docs/decisions/0004-state-management.md)). After a transfer or bill payment, the balances and the affected histories refetch, so every screen agrees without a reload.
- **Money and dates**: amounts are integer cents inside the app and formatted once. The API's timestamps are UTC without an offset and are read as such, then shown in your time zone ([ADR-0007](docs/decisions/0007-money-and-dates.md)).
- **Receipts**: the transfer and bill endpoints return no transaction id, so the new transaction is found in the account's latest history and its receipt opens at `/transfer/receipt/<id>` ([ADR-0008](docs/decisions/0008-receipt-resolution.md)).
- **Design tokens**: `docs/design/design-tokens.json` generates the theme CSS, so colours, type and spacing come from the spec in one place ([ADR-0006](docs/decisions/0006-design-tokens-pipeline.md)).

### Sign-in and token refresh

The access token lasts 10 minutes and the refresh token 24 hours. Refresh happens when a request gets a 401, as the API documentation describes ([ADR-0005](docs/decisions/0005-token-refresh-strategy.md)):

```
request ──401──┐
request ──401──┼─► refresh() ─── one shared refresh per tab, however many requests failed
request ──401──┘        │
                        ▼
         Web Lock "kifiya-refresh" ─── one refresh at a time across all tabs
                        │
         did another tab already rotate the refresh token?
            ├─ yes → use its new tokens
            └─ no  → POST /api/auth/refresh-token
                        ├─ 200 → keep the new access token in memory and the new
                        │        refresh token in storage, tell the other tabs,
                        │        retry each failed request once
                        └─ 401 → end the session in every tab, clear the cached
                                 data, go to /login?reason=expired
```

- A 401 from sign-in or from the refresh call itself never triggers another refresh.
- On load, a stored refresh token is exchanged once to restore the session. If the API can't be reached, you stay signed in and requests retry.
- Tabs share new tokens, logouts and expiry over a `BroadcastChannel`, so signing out in one tab signs out all of them.
- Whenever a session ends, the query cache and toasts are cleared, so nothing from one session shows in the next.

## Security

| Token           | Where kept     | Why                                                        |
| --------------- | -------------- | ---------------------------------------------------------- |
| Access (10 min) | Memory only    | Never written anywhere a script could find it after reload |
| Refresh (24 h)  | `localStorage` | Must survive a reload and be shared by tabs                |

**The trade-off** ([ADR-0003](docs/decisions/0003-token-storage.md)): the API returns tokens in the response body and has no cookie support, so a browser-only client has to keep the refresh token somewhere a script can read. A successful XSS attack could steal it. The app lowers that risk:

- A nonce-based Content-Security-Policy runs only the app's own scripts and lets the page connect only to itself and the API ([ADR-0010](docs/decisions/0010-content-security-policy.md)).
- No third-party scripts, no `eval`, and no HTML from the API rendered as HTML.
- The refresh token rotates on every refresh.
- Logout clears the tokens and the cache.
- Other headers: no framing, `nosniff`, a strict referrer policy and `noindex`.
- The `?next=` return path after sign-in only accepts paths inside the app.

**In production** this would change: a backend-for-frontend (Next.js route handlers) would sit between the browser and the API. It would keep both tokens in `HttpOnly; Secure; SameSite=Strict` cookies, refresh on the server, and protect mutations against CSRF. The browser would then never see a token, and an XSS attack could no longer carry one away. It isn't built here because the brief asks for a client of the given API, with the refresh flow handled in that client.

## Quality

Each has its own document with every detail: [testing.md](docs/testing.md), [accessibility.md](docs/accessibility.md), [security.md](docs/security.md), [performance.md](docs/performance.md) and [fidelity.md](docs/fidelity.md). What every screen does, down to each message, is in [features.md](docs/features.md).

- **Tests**:
  - Vitest and Testing Library cover units and components, against the same MSW mock the app uses offline.
  - Playwright runs end-to-end tests on a production build: sign-in, register, route protection, session restore, token refresh, logout across tabs, transfers and their errors, bills, history, responsive layouts, keyboard use, and axe on every page.
  - Every e2e test also fails if the page breaks the CSP or calls any host but the mock.
- **CI**: every pull request runs type-check, lint, format check, unit tests and a production build, then the end-to-end tests. Git hooks run the fast checks before each commit and push.
- **Accessibility**: WCAG 2.2 AA, checked with axe on every page in both themes, keyboard-only e2e runs of whole tasks, and an NVDA pass by hand. After navigation, focus moves to the page heading. Dialogs trap and restore focus, and reduced motion is respected. Money in and out never rest on colour alone: rows carry a sign and are read out as "Money in" or "Money out". The exception is a few colour pairs from the design's own tokens (below).
- **Performance**: Lighthouse on every page: performance 98–100 on a simulated slow phone and 100 on desktop, best practices 100. Moving to `zod/mini` cut about 320 KB of script from every page.
- **Design fidelity**: a screenshot of every spec frame, light and dark, with each known difference explained ([docs/fidelity.md](docs/fidelity.md)).
- **Traceability**: every requirement in the brief is mapped to the work and the evidence for it in [docs/requirements.md](docs/requirements.md).

## Assumptions and known limitations

Where the brief, design and API disagree or leave gaps, the decision is recorded in [docs/spec-notes.md](docs/spec-notes.md). The ones a user would notice:

- **No fees**: the API charges none, so the Fee row always says ETB 0.00.
- **Recipients are shown by account number only**: the API can't look up whose account a number is.
- **The money in / money out filter works on the transactions loaded so far**: the API can't filter by direction. Load more brings in older ones.
- **There is no search, change password or forgot password**: the design shows them, but the API has no endpoints for them. Change password is shown as "Not available yet".
- **The receipt reference comes from the history**: if the new transaction can't be found there, the receipt shows without a reference and says where to find it.
- **English only**: dates and money are formatted with `Intl`, so other languages would mainly need the text translated.
- **Some colour pairs from the design's tokens are below WCAG AA contrast**: the money-in green on white (3.49:1), money out (4.28:1), the warning text, placeholders, the focus ring, and dark-mode links. The tokens are used exactly as given, by decision; the measurements and the nearest passing shades are in [accessibility.md](docs/accessibility.md#contrast).
- **Dark mode colours follow the design tokens** where the dark screens draw slightly different ones.

## How AI was used

I built this with Claude Code as a pair programmer. I set the process: an issue for every task, a branch and pull request per issue, CI before every merge, and decisions written down as they were made. I reviewed the work as it landed and checked the main flows myself in Chrome. Claude Code wrote most of the code, tests and documentation under that process, and ran the browser checks against a local mock so that automated runs never sent credentials to the shared API.

One thing that changed after review: my own test with a duplicated tab showed that logging out in one tab left the other stuck on its loading screen. The fix gave tabs a `BroadcastChannel` to share new tokens, logout and expiry, and serialised refreshes across tabs with Web Locks, so two tabs can never both spend the same refresh token ([ADR-0005](docs/decisions/0005-token-refresh-strategy.md)). An end-to-end test now logs out in one tab and checks the other.

## Scripts

| Command                                   | What it does                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev`                                | Start the development server                                                      |
| `pnpm build` / `pnpm start`               | Production build / serve it                                                       |
| `pnpm test`                               | Unit and component tests (Vitest); `test:watch`, `test:coverage`                  |
| `pnpm e2e`                                | Playwright tests on a mock-mode build; once: `pnpm exec playwright install`       |
| `pnpm typecheck`                          | Generate Next.js route types, then `tsc --noEmit`                                 |
| `pnpm lint` / `pnpm lint:fix`             | ESLint, zero warnings allowed                                                     |
| `pnpm format` / `pnpm format:check`       | Prettier                                                                          |
| `pnpm fidelity`                           | Screenshot every spec frame into `docs/fidelity/`                                 |
| `pnpm lighthouse`                         | Lighthouse on every page against a local mock API (see `docs/performance.md`)     |
| `pnpm api:snapshot`                       | Download the API's current OpenAPI document to `docs/api/openapi.json`            |
| `pnpm api:types` / `pnpm api:types:check` | Generate API types from the snapshot / check they're current                      |
| `pnpm tokens` / `pnpm tokens:check`       | Generate the theme CSS from `docs/design/design-tokens.json` / check it's current |

## Documentation

[`docs/`](docs/README.md) has every detail: the features screen by screen, architecture, decision records, security, testing, accessibility, performance, design fidelity, API notes, spec notes, requirements traceability, the backlog and the workflow. Work is tracked as issues and milestones on the [project board](https://github.com/users/MuhidinM/projects/2). Releases are listed in [CHANGELOG.md](CHANGELOG.md).
