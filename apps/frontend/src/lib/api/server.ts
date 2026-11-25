import "server-only";
import { cookies } from "next/headers";
import { getLocale } from "next-intl/server";
import { LOCALE_HEADER } from "@kilotrace/ui/i18n/locale";

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

export type ServerApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number };

/** Server-side API client: forwards the incoming request cookies to the backend. */
export async function serverApiGet<T>(path: string): Promise<ServerApiResult<T>> {
  const cookieHeader = (await cookies()).toString();
  const response = await fetch(`${API_URL}/api${path}`, {
    headers: { Accept: "application/json", Cookie: cookieHeader, [LOCALE_HEADER]: await getLocale() },
    cache: "no-store",
  });
  if (!response.ok) {
    return { ok: false, status: response.status };
  }
  return { ok: true, data: (await response.json()) as T };
}

