import type { AdminGoogleAuthorization } from "@kilotrace/shared/admin";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { adminApi } from "@/lib/admin/api";
import { SESSION_COOKIE_OPTIONS } from "@/lib/admin/session-cookie";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_PATH } from "./state-cookie";

/** Starts the Google sign-in of the back office: Google comes back to `/auth/google/callback`. */
export async function GET(request: NextRequest) {
  const result = await adminApi<AdminGoogleAuthorization>("/auth/google", "POST").catch(() => null);
  if (!result?.ok) {
    return NextResponse.redirect(new URL("/login?error=google", request.url));
  }
  (await cookies()).set(GOOGLE_STATE_COOKIE, result.data.state, {
    ...SESSION_COOKIE_OPTIONS,
    path: GOOGLE_STATE_PATH,
    maxAge: 10 * 60,
  });
  return NextResponse.redirect(result.data.url);
}
