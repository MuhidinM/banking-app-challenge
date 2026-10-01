# Kifiya Banking Web Client

[![CI](https://github.com/MuhidinM/banking-app-challenge/actions/workflows/ci.yml/badge.svg)](https://github.com/MuhidinM/banking-app-challenge/actions/workflows/ci.yml)

A responsive banking web client for the Kifiya Web Developer Challenge, built with Next.js 16, React 19 and TypeScript against the [challenge banking API](https://challenge-api.qena.dev/scalar).

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

## Scripts

| Command                                   | What it does                                                                      |
| ----------------------------------------- | --------------------------------------------------------------------------------- |
| `pnpm dev`                                | Start the development server                                                      |
| `pnpm build` / `pnpm start`               | Production build / serve it                                                       |
| `pnpm test`                               | Unit and component tests (Vitest); `test:watch`, `test:coverage`                  |
| `pnpm typecheck`                          | Generate Next.js route types, then `tsc --noEmit`                                 |
| `pnpm lint` / `pnpm lint:fix`             | ESLint, zero warnings allowed                                                     |
| `pnpm format` / `pnpm format:check`       | Prettier                                                                          |
| `pnpm api:snapshot`                       | Download the API's current OpenAPI document to `docs/api/openapi.json`            |
| `pnpm api:types` / `pnpm api:types:check` | Generate API types from the snapshot / check they're current                      |
| `pnpm tokens` / `pnpm tokens:check`       | Generate the theme CSS from `docs/design/design-tokens.json` / check it's current |

Git hooks run lint and format on staged files before each commit, and the type-check and tests before each push. CI runs all checks plus a production build on every pull request.

## Documentation

Architecture, decisions, requirements traceability and the backlog are in [`docs/`](docs/README.md).
