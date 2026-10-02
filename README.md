# Kifiya Banking Web Client

[![CI](https://github.com/MuhidinM/banking-app-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/MuhidinM/banking-app-challenge/actions/workflows/ci.yml)

A responsive banking web client for the Kifiya Web Developer Challenge, built with Next.js 16, React 19 and TypeScript against the [challenge banking API](https://challenge-api.qena.dev/scalar).

**Live:** <https://banking-app-challenge-beta.vercel.app> — deployed on Vercel from `main`, against the real API (sign up, or use a demo user from the API's documentation). Pull requests get preview deployments.

> **Work in progress.** This README covers setup only. The full README (features, architecture, the token refresh flow, trade-offs) is tracked in [#53](https://github.com/MuhidinM/banking-app-challenge/issues/53). Progress is on the [project board](https://github.com/users/MuhidinM/projects/2).

## Getting started

Requires Node.js 24 (see `.nvmrc`) and pnpm 12.

```bash
pnpm install
cp .env.example .env.local
pnpm dev
```

Open <http://localhost:3000>. Environment variables are described in [`.env.example`](.env.example).

### Run offline with the mock API

Set `NEXT_PUBLIC_API_MOCKING=on` in `.env.local` and restart `pnpm dev`. Every API call is then answered by an in-browser mock ([MSW](https://mswjs.io)) with sample data, and nothing is sent to the shared API. Sign in with the demo users documented by the API: `demo.jane` (two accounts with history), `demo.john` (a transfer recipient) or `demo.empty` (no transactions), all with the password `Password123!`. The mock keeps its data in localStorage, so a reload keeps you signed in and keeps your transfers; clear the site's data to start again from the seed.

### Watch the token refresh

Access tokens last 10 minutes. Set `NEXT_PUBLIC_DEV_TOOLS=on` and restart to get a **Session** button in the bottom-right corner. It shows when both tokens expire and how often this tab has refreshed. **Expire access token now** followed by **3 calls at once** shows three 401s, a single refresh, and three retries that succeed. **Expire refresh token too** shows the session ending and the login page's "session expired" banner. It works with the mock and with the real API, because it only replaces the token this tab holds.

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
| `pnpm api:snapshot`                       | Download the API's current OpenAPI document to `docs/api/openapi.json`            |
| `pnpm api:types` / `pnpm api:types:check` | Generate API types from the snapshot / check they're current                      |
| `pnpm tokens` / `pnpm tokens:check`       | Generate the theme CSS from `docs/design/design-tokens.json` / check it's current |

Git hooks run lint and format on staged files before each commit, and the type-check and tests before each push. CI runs all checks plus a production build on every pull request, and the end-to-end tests in a second job.

## Extras

Small additions beyond the brief, all in the existing design language:

- **Hide balances**: the eye button on the dashboard masks the total balance, and the choice is remembered on this device.
- **Copy account number**: on each account's page, with a confirmation toast; Share sends it through the device's share sheet.
- **Share receipt**: transfer, bill and transaction receipts can be shared, or copied as text where sharing isn't available.
- **Recent recipients**: on Transfer, chips under the account number fill in an account the chosen account sent money to lately, read from its history.
- **Offline banner**: a warning above every page while the connection is down; when it returns, a toast says so and what's on screen refreshes. A transfer confirmed offline fails at once instead of being sent later.
- **CSV export**: Download CSV under an account's history saves the rows loaded so far, with the filter applied, as `kifiya-<account>-<date>.csv`.

## Documentation

Architecture, decisions, requirements traceability and the backlog are in [`docs/`](docs/README.md).
