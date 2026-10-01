import { type NextRequest, NextResponse } from "next/server";

import { safeReturnPath } from "@/features/auth/return-path";
import { isAuthPath, isProtectedPath, loginPath } from "@/features/auth/routes";
import { SESSION_COOKIE } from "@/features/auth/session-store";
import { env } from "@/shared/config/env";
import { NONCE_HEADER, contentSecurityPolicy, createNonce } from "@/shared/config/security-headers";

/** The last path segment has an extension: /mockServiceWorker.js, /brand/logo.svg. */
const FILE_PATH = /\.[a-z0-9]+$/i;

/**
 * Optimistic route protection (ADR-0002). The tokens live in the browser, so
 * the server only sees the `has_session=1` hint cookie and redirects on it
 * before rendering, which avoids a flash of the wrong page. It is not the
 * security check: the client guard (RequireSession) checks the stored session,
 * and the API checks every request.
 *
 * Pages it lets through get a Content-Security-Policy with a fresh nonce
 * (ADR-0010). Next.js reads the nonce from the request header and puts it on
 * its own scripts; the root layout puts it on the theme script.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
  // A file (e.g. a new one in public/ the matcher doesn't list): never redirect it.
  if (FILE_PATH.test(pathname)) return NextResponse.next();
  const hasSession = request.cookies.get(SESSION_COOKIE)?.value === "1";

  // Signed in: /login and /register go on to where the user was heading.
  if (hasSession && isAuthPath(pathname)) {
    const next = safeReturnPath(searchParams.get("next") ?? undefined);
    return NextResponse.redirect(new URL(next, request.url));
  }

  // Signed out: protected pages go to /login, and back here afterwards.
  if (!hasSession && isProtectedPath(pathname)) {
    return NextResponse.redirect(new URL(loginPath({ next: `${pathname}${search}` }), request.url));
  }

  return withContentSecurityPolicy(request);
}

function withContentSecurityPolicy(request: NextRequest) {
  const nonce = createNonce();
  const policy = contentSecurityPolicy({
    nonce,
    apiBaseUrl: env.apiBaseUrl,
    dev: process.env.NODE_ENV === "development",
  });
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(NONCE_HEADER, nonce);
  requestHeaders.set("Content-Security-Policy", policy);
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", policy);
  return response;
}

export const config = {
  // Pages only, not Next.js assets or files in public/. The MSW worker matters
  // most: a browser won't register a service worker that is behind a redirect.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|mockServiceWorker.js|brand/).*)"],
};
