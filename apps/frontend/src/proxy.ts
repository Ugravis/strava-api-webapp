import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  PROTECTED_PREFIXES,
  routes,
  SESSION_COOKIE,
} from "@/config/routes";

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/**
 * Optimistic redirects based on the presence of the session cookie only.
 * The session itself is validated by the backend when the page renders.
 */
export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isUnder(pathname, "/api/admin")) {
    return withoutCookies(request);
  }
  if (isUnder(pathname, "/admin")) {
    return (await isAdmin(request)) ? NextResponse.next() : notFound(request);
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
 * The back-office API is called by the Next.js server only: from the
 * browser, it goes through without the session, so the backend answers the
 * 404 of an unknown route, even to an admin.
 */
function withoutCookies(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.delete("cookie");
  return NextResponse.next({ request: { headers } });
}

/**
 * Checked here, before rendering starts, so that the 404 keeps its status
 * code: a page already streaming can no longer change it.
 */
async function isAdmin(request: NextRequest): Promise<boolean> {
  if (!request.cookies.has(SESSION_COOKIE)) {
    return false;
  }
  const response = await fetch(`${API_URL}/api/admin/me`, {
    headers: { Accept: "application/json", Cookie: request.headers.get("cookie") ?? "" },
    cache: "no-store",
  }).catch(() => null);
  return response?.ok ?? false;
}

/**
 * The very page of an unknown route, with its status. Next.js discloses the
 * rewrite in an `x-middleware-rewrite` response header, which the public web
 * server removes (docker/Caddyfile): it is the only rewrite of the proxy.
 */
function notFound(request: NextRequest) {
  return NextResponse.rewrite(new URL("/_not-found", request.url), { status: 404 });
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/achievements/:path*",
    "/map/:path*",
    "/profile/:path*",
    "/settings/:path*",
    "/admin/:path*",
    "/api/:path*",
  ],
};
