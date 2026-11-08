import "server-only";
import type { SystemStatusResponse } from "@kilotrace/shared";
import { serverApiGet } from "@/lib/api/server";

const status = () => serverApiGet<SystemStatusResponse>("/system/status").catch(() => null);

/** False while the back office has closed the sign-ups; open when the API cannot tell. */
export async function signupsEnabled(): Promise<boolean> {
  const result = await status();
  return !result?.ok || result.data.signupsEnabled;
}

/** False while the back office has turned off the showcase of the profiles; on when the API cannot tell. */
export async function profileShowcaseEnabled(): Promise<boolean> {
  const result = await status();
  return !result?.ok || result.data.profileShowcaseEnabled;
}
