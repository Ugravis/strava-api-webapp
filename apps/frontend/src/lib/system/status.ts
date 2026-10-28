import "server-only";
import type { SystemStatusResponse } from "@kilotrace/shared";
import { serverApiGet } from "@/lib/api/server";

/** False while the back office has closed the sign-ups; open when the API cannot tell. */
export async function signupsEnabled(): Promise<boolean> {
  const result = await serverApiGet<SystemStatusResponse>("/system/status").catch(() => null);
  return !result?.ok || result.data.signupsEnabled;
}
