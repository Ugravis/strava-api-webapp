import { ADMIN_SESSION_COOKIE } from "@kilotrace/shared/admin";
import { type NextRequest, NextResponse } from "next/server";
import { PERSISTENT_MAX_AGE_SECONDS, PERSISTENT_PREFIX, SESSION_COOKIE_OPTIONS } from "@/lib/admin/session-cookie";

/**
 * Optimistic redirect to the sign-in on the absence of the session cookie
 * only: the session itself is checked by the backend as the page renders.
 * A "stay signed in" cookie is extended on every page, as the session it
 * holds is on every use: on page loads only, never on a Server Action,
 * whose response would then carry a cookie and make Next.js refresh the
 * page, which runs the actions of its tables again, endlessly.
 */
export function proxy(request: NextRequest) {
  const value = request.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  const { pathname } = request.nextUrl;
  const isSignIn = pathname === "/login" || pathname.startsWith("/auth/");

  if (!value && !isSignIn) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  const response = NextResponse.next();
  const isAction = request.method !== "GET" || request.headers.has("next-action");
  if (value?.startsWith(PERSISTENT_PREFIX) && !isAction) {
    response.cookies.set(ADMIN_SESSION_COOKIE, value, { ...SESSION_COOKIE_OPTIONS, maxAge: PERSISTENT_MAX_AGE_SECONDS });
  }
  return response;
}

export const config = {
  // Everything but the assets of the build and the public images of the
  // API: the files of `public/` too stay behind the session cookie.
  matcher: ["/((?!_next/|api/|favicon.ico).*)"],
};
