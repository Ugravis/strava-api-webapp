import "server-only";
import { API_URL, backendHeaders } from "./session";

/** A failure: `code` the API error code; `field` and `message` those of a field refused by the shared rules (`INVALID_FIELD`). */
export type AdminApiResult<T> = { ok: true; data: T } | { ok: false; status: number; code?: string; field?: string; message?: string };

type Method = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

/**
 * Back-office API client, for server components, Server Actions and route
 * handlers only: the browser never reaches the backend. Sends the secret of
 * the admin app and the session of the back office; the rate limit counts
 * per admin. A `FormData` body goes as is (a file), anything else as JSON.
 */
export async function adminApi<T = void>(path: string, method: Method = "GET", json?: unknown): Promise<AdminApiResult<T>> {
  const form = json instanceof FormData;
  const response = await fetch(`${API_URL}/api/admin${path}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(await backendHeaders()),
      ...(json !== undefined && !form && { "Content-Type": "application/json" }),
    },
    body: json === undefined ? undefined : form ? json : JSON.stringify(json),
    cache: "no-store",
  });
  if (!response.ok) {
    const error = (await response.json().catch(() => null)) as { code?: unknown; field?: unknown; message?: unknown } | null;
    return {
      ok: false,
      status: response.status,
      ...(typeof error?.code === "string" && { code: error.code }),
      ...(typeof error?.field === "string" && typeof error.message === "string" && { field: error.field, message: error.message }),
    };
  }
  if (response.status === 204) {
    return { ok: true, data: undefined as T };
  }
  return { ok: true, data: (await response.json()) as T };
}
