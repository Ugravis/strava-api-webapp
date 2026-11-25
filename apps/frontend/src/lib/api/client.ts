import { isLocale, LOCALE_HEADER } from "@kilotrace/ui/i18n/locale";
import { toApiError } from "./errors";

type RequestBody = { json: unknown } | { formData: FormData };

interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: RequestBody;
}

/**
 * Browser-side API client. Requests go through the same-origin `/api`
 * rewrite, so the session cookie is sent automatically.
 */
export async function apiRequest<T = void>(
  path: string,
  { method = "GET", body }: RequestOptions = {},
): Promise<T> {
  const init: RequestInit = { method, headers: { Accept: "application/json", ...localeHeader() } };
  if (body && "json" in body) {
    init.headers = { ...init.headers, "Content-Type": "application/json" };
    init.body = JSON.stringify(body.json);
  } else if (body) {
    init.body = body.formData;
  }

  const response = await fetch(`/api${path}`, init);
  if (!response.ok) {
    throw await toApiError(response);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  return (await response.json()) as T;
}

/** The language of the page, set on its root element by the layout, for the content the API translates. */
function localeHeader(): Record<string, string> {
  const locale = document.documentElement.lang;
  return isLocale(locale) ? { [LOCALE_HEADER]: locale } : {};
}
