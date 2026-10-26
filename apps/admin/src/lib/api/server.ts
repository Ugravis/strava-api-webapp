import "server-only";
import type { AdminMe } from "@kilotrace/shared";
import { cookies } from "next/headers";
import { cache } from "react";

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

/** Server-side call to the back-office API, forwarding the session cookie. */
async function adminApiGet(path: string): Promise<Response> {
  const cookieHeader = (await cookies()).toString();
  return fetch(`${API_URL}/api/admin${path}`, {
    headers: { Accept: "application/json", Cookie: cookieHeader },
    cache: "no-store",
  });
}

/** The signed-in account, or null without a valid session. Once per request. */
export const getAdminMe = cache(async (): Promise<AdminMe | null> => {
  const response = await adminApiGet("/me");
  if (response.status === 401) {
    return null;
  }
  if (!response.ok) {
    throw new Error(`GET /admin/me failed with ${response.status}`);
  }
  return (await response.json()) as AdminMe;
});
