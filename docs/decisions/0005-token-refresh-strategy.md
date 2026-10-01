# ADR-0005 · Reactive single-flight refresh, locked across tabs

**Status:** accepted · 2026-10-01

## Context
Required: on 401, refresh, replace both tokens, retry once; concurrent 401s → one refresh; refresh failure → logout. Refresh tokens rotate, so two refreshes with the same token fail.

## Decision
1. **Reactive** refresh on 401, as the brief describes. No proactive timer — fewer moving parts, and the API documentation describes exactly this 401 → refresh flow.
2. **Single-flight in a tab:** one shared promise for the refresh in progress; every failed request awaits it, then retries once with the new token.
3. **Across tabs:** wrap the refresh in `navigator.locks.request("kifiya-refresh")`. Inside the lock, re-read the stored refresh token; if another tab already rotated it, use the new tokens without calling the API. Tabs learn about new tokens and logout through the `storage` event.
4. Never refresh in response to a 401 from `/auth/login` or `/auth/refresh-token`.
5. Refresh failure → clear session and query cache → `/login?reason=expired`.

## Consequences
- Tests: N concurrent 401s → 1 refresh call; retries use the new token; retry happens only once; refresh failure clears the session; a second tab reuses rotated tokens.
- Web Locks is in all current browsers; if it's missing we fall back to per-tab single-flight.
