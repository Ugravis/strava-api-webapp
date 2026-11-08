import { NextResponse, type NextRequest } from "next/server";
import { routes, SESSION_COOKIE } from "@/config/routes";

/** Clears a session cookie the API no longer accepts, then goes back to login. */
export function GET(request: NextRequest) {
  const url = new URL(routes.login, request.url);
  url.searchParams.set("expired", "1");
  const response = NextResponse.redirect(url);
  response.cookies.delete(SESSION_COOKIE);
  return response;
}
