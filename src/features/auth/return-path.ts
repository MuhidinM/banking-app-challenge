/**
 * Where to go after signing in. `?next=` comes from the URL, so anyone can put
 * anything there: only a path on this site is accepted, never another origin
 * (an open redirect would let a phishing link bounce through our login page).
 */

export const HOME_PATH = "/";

/** Pages that make no sense to return to once signed in. */
const AUTH_PATHS = ["/login", "/register"];

// Any fixed origin works: it only tells us whether `next` would leave the site.
const BASE = "https://return-path.invalid";

export function safeReturnPath(next: string | string[] | undefined): string {
  if (typeof next !== "string" || !next.startsWith("/")) return HOME_PATH;

  let url: URL;
  try {
    url = new URL(next, BASE);
  } catch {
    return HOME_PATH;
  }
  // "//evil.example" and "/\evil.example" are protocol-relative: the browser
  // would leave the site. The URL parser resolves them to another origin.
  if (url.origin !== BASE) return HOME_PATH;
  if (AUTH_PATHS.some((path) => url.pathname === path || url.pathname.startsWith(`${path}/`))) {
    return HOME_PATH;
  }
  return `${url.pathname}${url.search}${url.hash}`;
}
