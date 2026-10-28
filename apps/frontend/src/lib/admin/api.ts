import "server-only";
import { cookies } from "next/headers";

const API_URL = process.env.API_INTERNAL_URL ?? "http://localhost:4000";

export type AdminApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code?: string };

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Back-office API client, for server components and Server Actions only:
 * `/api/admin` is never called by the browser (the proxy blocks it). The
 * session cookie is forwarded; the rate limit counts per admin.
 */
export async function adminApi<T = void>(path: string, method: Method = "GET", json?: unknown): Promise<AdminApiResult<T>> {
  const response = await fetch(`${API_URL}/api/admin${path}`, {
    method,
    headers: {
      Accept: "application/json",
      Cookie: (await cookies()).toString(),
      ...(json !== undefined && { "Content-Type": "application/json" }),
    },
    body: json === undefined ? undefined : JSON.stringify(json),
    cache: "no-store",
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { code?: unknown } | null;
    return { ok: false, status: response.status, ...(typeof error?.code === "string" && { code: error.code }) };
  }
  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }
  return { ok: true, data: (await response.json()) as T };
}
