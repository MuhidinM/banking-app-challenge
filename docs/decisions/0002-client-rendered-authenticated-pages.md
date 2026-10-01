# ADR-0002 · Authenticated pages are client-rendered; proxy does optimistic checks only

**Status:** accepted · 2026-10-01

## Context
Tokens live in the browser (ADR-0003). The Next server never sees them, so Server Components can't fetch user data. Rendering protected UI before the session state is known causes a flash of content or of the login page.

## Decision
- Root layout, auth layout, fonts, metadata and static panels are Server Components.
- Data screens are Client Components using TanStack Query through the typed API client.
- On login we set a non-sensitive cookie `has_session=1` (no token inside). `proxy.ts` redirects `/login` ↔ protected routes based on it — an optimistic check, as the Next.js 16 auth guide recommends.
- The client guard is the real check: no refresh token → `/login`. The API is the final authority.

## Consequences
- No flash between login and app on navigation or reload.
- A stale `has_session` cookie costs one extra redirect; the client guard corrects it.
- Production alternative (README): a BFF with httpOnly cookies lets Server Components fetch data and makes proxy checks authoritative.
