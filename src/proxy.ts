import { type NextRequest, NextResponse } from "next/server";

import { safeReturnPath } from "@/features/auth/return-path";
import { isAuthPath, isProtectedPath, loginPath } from "@/features/auth/routes";
import { SESSION_COOKIE } from "@/features/auth/session-store";

/**
 * Optimistic route protection (ADR-0002). The tokens live in the browser, so
 * the server only sees the `has_session=1` hint cookie and redirects on it
 * before rendering, which avoids a flash of the wrong page. It is not the
 * security check: the client guard (RequireSession) checks the stored session,
 * and the API checks every request.
 */
export function proxy(request: NextRequest) {
  const { pathname, search, searchParams } = request.nextUrl;
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

  return NextResponse.next();
}

export const config = {
  // Pages only: not Next.js assets, the MSW worker or other files in public/.
  matcher: ["/((?!_next/static|_next/image|.*\.[\w]+$).*)"],
};
