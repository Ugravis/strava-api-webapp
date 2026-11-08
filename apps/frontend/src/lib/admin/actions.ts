import "server-only";
import { ADMIN_REASON_MAX_LENGTH, ADMIN_REASON_MIN_LENGTH } from "@kilotrace/shared/admin";
import { refresh } from "next/cache";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { type AdminApiResult, adminApi } from "./api";
import { getAdminTranslations } from "./messages";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type Method = Parameters<typeof adminApi>[1];

/** The outcome of a call; `field` the field refused, its message shown under it by a draft. */
export type AdminActionResult = ActionResult & { field?: string };

/**
 * Runs a back-office call for a Server Action: the backend checks the role
 * and records the action. The page is refreshed on success. `errors` tells
 * the failures by API error code, before the generic message of the status;
 * `{ field, message }` puts one under a field of a draft. A field refused by
 * the shared rules (`INVALID_FIELD`) comes back with its field and message.
 */
export async function runAdminAction(
  path: string,
  method: Method,
  json?: unknown,
  errors?: Partial<Record<string, string | { field: string; message: string }>>,
): Promise<AdminActionResult> {
  const t = getAdminTranslations("common");
  const result: AdminApiResult<void> | null = await adminApi(path, method, json).catch(() => null);
  if (!result?.ok) {
    const byCode = result?.code && errors?.[result.code];
    if (byCode) {
      return typeof byCode === "string" ? { ok: false, message: byCode } : { ok: false, ...byCode };
    }
    if (result?.code === "INVALID_FIELD" && result.field && result.message) {
      return { ok: false, field: result.field, message: result.message };
    }
    const status = result?.status;
    const known = status === 400 || status === 403 || status === 404 || status === 409 || status === 429;
    return { ok: false, message: t(known ? `errors.${status}` : "errors.other") };
  }
  refresh();
  return { ok: true, message: t("done") };
}

/** An id posted by the page, checked before it reaches a URL. */
export function checkedId(id: string): string {
  if (!UUID.test(id)) {
    throw new Error("Invalid id");
  }
  return id;
}

/** The reason typed in a confirmation, or undefined outside its bounds. */
export function reasonOf(formData: FormData): string | undefined {
  const value = formData.get("reason");
  const reason = typeof value === "string" ? value.trim() : "";
  return reason.length >= ADMIN_REASON_MIN_LENGTH && reason.length <= ADMIN_REASON_MAX_LENGTH ? reason : undefined;
}
