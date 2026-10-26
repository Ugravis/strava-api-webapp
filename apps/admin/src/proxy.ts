import { ADMIN_SESSION_COOKIE } from "@kilotrace/shared";
import { NextResponse, type NextRequest } from "next/server";
import { routes } from "@/config/routes";

/**
 * Optimistic redirect based on the presence of the session cookie only. The
 * session and the role are checked by the API on every request.
 */
export function proxy(request: NextRequest) {
  if (!request.cookies.has(ADMIN_SESSION_COOKIE)) {
    return NextResponse.redirect(new URL(routes.login, request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api|_next|login|favicon.ico|robots.txt).*)"],
};
