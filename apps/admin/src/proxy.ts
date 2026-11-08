import { ADMIN_SESSION_COOKIE } from "@kilotrace/shared/admin";
import { type NextRequest, NextResponse } from "next/server";
import { PERSISTENT_MAX_AGE_SECONDS, PERSISTENT_PREFIX, SESSION_COOKIE_OPTIONS } from "@/lib/admin/session-cookie";

/**
 * Optimistic redirect to the sign-in on the absence of the session cookie
 * only: the session itself is checked by the backend as the page renders.
 * A "stay signed in" cookie is extended on every page, as the session it
 * holds is on every use.
 */
export function proxy(request: NextRequest) {
  const value = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;
  const isSignIn = pathname === "/login" || pathname.startsWith("/auth/");

  if (!value && !isSignIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  if (value?.startsWith(PERSISTENT_PREFIX)) {
    response.cookies.set(ADMIN_SESSION_COOKIE, value, { ...SESSION_COOKIE_OPTIONS, maxAge: PERSISTENT_MAX_AGE_SECONDS });
  }
  return response;
}

export const config = {
  // Everything but the assets of the build and the public images of the
  // API: the files of `public/` too stay behind the session cookie.
  matcher: ["/((?!_next/|api/|favicon.ico).*)"],
};
