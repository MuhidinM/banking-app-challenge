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

### Details settled while building it (#17)

- **A late 401 doesn't refresh again.** A request sent with the old token that gets its 401 after the refresh finished sees that the current token differs from the one it used, and retries with the current token.
- **Only a rejected refresh ends the session.** If the API answers the refresh with a 4xx (e.g. `AUTH_005`), the session is cleared and `onSessionExpired` runs once. If the refresh can't reach the API (offline, timeout, 5xx), the session is kept and the original request fails with that error: losing the connection shouldn't log anyone out.
- **No access token is a normal state.** After a reload only the refresh token survives, so the first protected request goes out without a token, gets a 401, refreshes and retries. That is also how a session is restored (#18).
- **Retry once.** A retry that gets a 401 again returns the error to the caller.

Code: `src/shared/api/token-refresh.ts` (single-flight, session expiry, `runExclusive` hook for the cross-tab lock), `src/shared/api/http-client.ts` (refresh-and-retry on 401), `src/features/auth/api.ts` (the refresh request, validated).

## Consequences

- Tests: N concurrent 401s → 1 refresh call; retries use the new token; retry happens only once; refresh failure clears the session; offline keeps it; a second tab reuses rotated tokens (#24).
- Web Locks is in all current browsers; if it's missing we fall back to per-tab single-flight.
