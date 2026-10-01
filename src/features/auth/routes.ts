/**
 * Which pages need a session, and the login URL to send people to. Shared by
 * the route proxy (src/proxy.ts, an optimistic check on the `has_session`
 * cookie) and the client guard (RequireSession, the real check). ADR-0002.
 */

export const HOME_PATH = "/";
export const LOGIN_PATH = "/login";

/** Sign-in pages: a signed-in user is sent on from these. */
const AUTH_PATHS = [LOGIN_PATH, "/register"];

/** Pages anyone can open. The dev component gallery 404s in production by itself. */
const PUBLIC_PATHS = ["/dev"];

const matches = (pathname: string, paths: string[]) =>
  paths.some((path) => pathname === path || pathname.startsWith(`${path}/`));

export const isAuthPath = (pathname: string) => matches(pathname, AUTH_PATHS);

/** Everything that isn't a sign-in or public page needs a session. */
export const isProtectedPath = (pathname: string) =>
  !isAuthPath(pathname) && !matches(pathname, PUBLIC_PATHS);

/**
 * `/login`, with `next` (where to return; omitted for home) and
 * `reason=expired` (shows "Your session expired").
 */
export function loginPath({ next, expired = false }: { next?: string; expired?: boolean } = {}) {
  const params = new URLSearchParams();
  if (next && next !== HOME_PATH && !isAuthPath(next.split(/[?#]/, 1)[0] ?? "")) {
    params.set("next", next);
  }
  if (expired) params.set("reason", "expired");
  const query = params.toString();
  return query ? `${LOGIN_PATH}?${query}` : LOGIN_PATH;
}
