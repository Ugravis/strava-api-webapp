import type { AdminSessionResponse } from "@kilotrace/shared/admin";
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";
import { adminApi } from "@/lib/admin/api";
import { adminUrl } from "@/lib/admin/url";
import { openSession } from "@/lib/admin/session";
import { GOOGLE_STATE_COOKIE, GOOGLE_STATE_PATH } from "../state-cookie";

/**
 * Back from Google: the backend checks the state, the identity and its
 * role, then the session of the back office is set on this host only.
 */
export async function GET(request: NextRequest) {
  const cookieStore = await cookies();
  const signedState = cookieStore.get(GOOGLE_STATE_COOKIE)?.value;
  cookieStore.delete({ name: GOOGLE_STATE_COOKIE, path: GOOGLE_STATE_PATH });
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  if (!code || !state || !signedState) {
    return NextResponse.redirect(adminUrl("/login?error=google", request));
  }

  const result = await adminApi<AdminSessionResponse>("/auth/google/callback", "POST", { code, state, signedState }).catch(
    () => null,
  );
  if (!result?.ok) {
    const error = result?.status === 401 ? "refused" : "google";
    return NextResponse.redirect(adminUrl(`/login?error=${error}`, request));
  }
  await openSession(result.data);
  return NextResponse.redirect(adminUrl("/dashboard", request));
}
