# ADR-0003 · Access token in memory, refresh token in localStorage

**Status:** accepted · 2026-10-01

## Context

The brief requires sessions to survive reload and asks for "reasonable" storage for a demo, with awareness of production trade-offs. Access tokens live 10 min, refresh tokens 24 h and rotate on use.

## Decision

- Access token: memory only.
- Refresh token: `localStorage` (shared across tabs, survives reload).
- On load: if a refresh token exists, refresh once to get an access token, then render the app.

## Consequences

- XSS could steal the refresh token. Mitigations: CSP, no `dangerouslySetInnerHTML`, no third-party scripts, React escaping; rotation limits replay.
- `sessionStorage` rejected: doesn't survive a new tab and blocks cross-tab sessions.
- Production: BFF on Next route handlers, tokens in `HttpOnly; Secure; SameSite=Strict` cookies, CSRF protection on mutations. Documented in the README.
- Built in #18 (`src/features/auth/session-store.ts`): when localStorage is unavailable or throws (private mode, quota), the refresh token is kept in memory, so the session works until reload. A session that can't be checked on load because the API is unreachable stays signed in rather than logging the user out.
