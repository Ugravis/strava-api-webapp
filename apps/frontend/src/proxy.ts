import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { isLocale } from "@kilotrace/ui/i18n/locale";
import { routing } from "@/i18n/routing";
import {
  DEFAULT_AUTHENTICATED_ROUTE,
  PROTECTED_PREFIXES,
  routes,
  SESSION_COOKIE,
} from "@/config/routes";

const intl = createIntlMiddleware(routing);

/**
 * Optimistic redirects based on the presence of the session cookie only, on
 * the path without its language prefix, then the language of the request:
 * its prefix, otherwise the cookie of its last choice, otherwise the browser.
 * The session itself is validated by the backend when the page renders.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isUnder(pathname, "/api")) {
    return isUnder(pathname, "/api/admin") ? backOfficeNotFound(request) : NextResponse.next();
  }

  const { prefix, path } = splitLocale(pathname);
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isProtected = PROTECTED_PREFIXES.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`));
  if (isProtected && !hasSession) {
    const url = new URL(`${prefix}${routes.login}`, request.url);
    url.searchParams.set("next", `${path}${search}`);
    return NextResponse.redirect(url);
  }

  if (path === routes.home && hasSession) {
    return NextResponse.redirect(new URL(`${prefix}${DEFAULT_AUTHENTICATED_ROUTE}`, request.url));
  }

  return intl(request);
}

/** The language prefix of a path, empty for English, and the path without it. */
function splitLocale(pathname: string): { prefix: string; path: string } {
  const segment = pathname.split("/")[1];
  if (!isLocale(segment) || segment === routing.defaultLocale) return { prefix: "", path: pathname };
  return { prefix: `/${segment}`, path: pathname.slice(segment.length + 1) || "/" };
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

/** Every page, and the API for the back office lock; files, route handlers and Next.js internals are left out. */
export const config = {
  matcher: ["/api/:path*", "/((?!api|_next|_vercel|session-expired|.*\\..*).*)"],
};
