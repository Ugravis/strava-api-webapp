import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { internalPathname, localePath, localizedPathname } from "@kilotrace/shared";
import { isLocale, type Locale } from "@kilotrace/ui/i18n/locale";
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
 * the path of the code (the address without its language prefix, its
 * localized path read back), then the language of the request: its prefix,
 * otherwise the cookie of its last choice, otherwise the browser. The
 * session itself is validated by the backend when the page renders. An
 * address in another language than its prefix (`/fr/login`, a link of
 * before) moves to the one of the language (`/fr/connexion`).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (isUnder(pathname, "/api")) {
    return isUnder(pathname, "/api/admin") ? backOfficeNotFound(request) : NextResponse.next();
  }

  const { locale, path: shown } = splitLocale(pathname);
  const path = internalPathname(locale, shown);
  if (locale !== routing.defaultLocale && localizedPathname(locale, shown) !== shown) {
    return NextResponse.redirect(new URL(`${localePath(locale, shown)}${search}`, request.url), 308);
  }
  const hasSession = request.cookies.has(SESSION_COOKIE);
  const isProtected = PROTECTED_PREFIXES.some((protectedPath) => path === protectedPath || path.startsWith(`${protectedPath}/`));
  if (isProtected && !hasSession) {
    const url = new URL(localePath(locale, routes.login), request.url);
    url.searchParams.set("next", `${path}${search}`);
    return NextResponse.redirect(url);
  }

  if (path === routes.home && hasSession) {
    return NextResponse.redirect(new URL(localePath(locale, DEFAULT_AUTHENTICATED_ROUTE), request.url));
  }

  return intl(request);
}

/** The language of a path from its prefix, English without one, and the path without it. */
function splitLocale(pathname: string): { locale: Locale; path: string } {
  const segment = pathname.split("/")[1];
  if (!isLocale(segment) || segment === routing.defaultLocale) return { locale: routing.defaultLocale, path: pathname };
  return { locale: segment, path: pathname.slice(segment.length + 1) || "/" };
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
