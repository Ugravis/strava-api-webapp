import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  PROTECTED_PREFIXES,
  routes,
  SESSION_COOKIE,
} from "@/config/routes";

/**
 * Optimistic redirects based on the presence of the session cookie only.
 * The session itself is validated by the backend when the page renders.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isUnder(pathname, "/api/admin")) {
    return backOfficeNotFound(request);
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

/** Case, encoding and repeated slashes are ignored, as the backend router does. */
function isUnder(pathname: string, prefix: string): boolean {
  let path = pathname;
  try {
    path = decodeURIComponent(pathname);
  } catch {
    // A malformed path is matched as is.
  }
  path = path.toLowerCase().replace(/\/{2,}/g, "/");
  return path === prefix || path.startsWith(`${prefix}/`);
}

/**
 * The back office lives in its own app, on its own host: its API is never
 * relayed from here, whatever the cookies. Answered as the backend answers
 * an unknown route, so that nothing tells it apart.
 */
function backOfficeNotFound(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  return NextResponse.json(
    { message: `Cannot ${request.method} ${pathname}${search}`, error: "Not Found", statusCode: 404 },
    { status: 404 },
  );
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/achievements/:path*",
    "/map/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/api/:path*",
  ],
};
