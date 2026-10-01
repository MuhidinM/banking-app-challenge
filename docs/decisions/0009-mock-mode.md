# ADR-0009 · MSW mock mode shared by the app, unit tests and E2E

**Status:** accepted · 2026-10-01

## Context

The hosted API is shared and must not be abused. Error states (insufficient funds, expired refresh token, empty accounts, network failure) are hard to trigger on demand against it.

## Decision

One set of MSW handlers and fixtures in `src/mocks/`, used by:

- the app when `NEXT_PUBLIC_API_MOCKING=on` (anyone can run the app offline),
- Vitest (node server),
- Playwright in CI.

Handlers implement the real contract: token rotation, expiry (shortened in tests), pagination, error codes.

## Consequences

- Deterministic CI with no load on the shared API.
- Risk of drift from the real API → a manual live smoke run before release (requirements.md §I).
