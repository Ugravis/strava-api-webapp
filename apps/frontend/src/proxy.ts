import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  PROTECTED_PREFIXES,
  routes,
  SESSION_COOKIE,
} from "@/config/routes";

/** The back-office API is only served on its own subdomain, never relayed here. */
const ADMIN_API_PATH = /^\/api\/+admin(\/|$)/i;

/**
 * Optimistic redirects based on the presence of the session cookie only.
 * The session itself is validated by the backend when the page renders.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (ADMIN_API_PATH.test(pathname)) {
    return new NextResponse(null, { status: 404 });
  }
  const hasSession = request.cookies.has(SESSION_COOKIE);

  const isProtected = PROTECTED_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
  if (isProtected && !hasSession) {
    const url = new URL(routes.login, request.url);
    url.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(url);
  }

  if (pathname === routes.home && hasSession) {
    return NextResponse.redirect(new URL(DEFAULT_AUTHENTICATED_ROUTE, request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/", "/api/:path*", "/dashboard/:path*", "/achievements/:path*", "/map/:path*", "/profile/:path*", "/settings/:path*"],
};
