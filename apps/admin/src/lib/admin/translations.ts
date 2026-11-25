import "server-only";
import type { FillTranslationsRequest, FillTranslationsResponse, TargetLocale, UpdateTranslationRequest } from "@kilotrace/shared";
import { refresh } from "next/cache";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { runAdminAction } from "./actions";
import { adminApi } from "./api";
import { getAdminTranslations } from "./messages";

/*
 * The translations of a content of the back office, under `base` (e.g.
 * `/user-tags/founder`): the backend checks the permission and the field,
 * and records every call.
 */

/** One field of one language typed by hand, null clearing it. */
export function saveTranslation(base: string, locale: TargetLocale, field: string, value: string | null): Promise<ActionResult> {
  const body: UpdateTranslationRequest = { locale, field, value };
  return runAdminAction(`${base}/translations`, "PUT", body, {
    TRANSLATION_UNAVAILABLE: getAdminTranslations("translations")("unavailable"),
  });
}

/** The fields empty or to review in every language machine-translated by DeepL; `all` every one, those typed by hand included. */
export async function fillTranslations(base: string, all: boolean): Promise<ActionResult> {
  const t = getAdminTranslations("translations");
  const body: FillTranslationsRequest = { all: all === true };
  const result = await adminApi<FillTranslationsResponse>(`${base}/translations/fill`, "POST", body).catch(() => null);
  if (!result?.ok) {
    return { ok: false, message: t(result?.code === "TRANSLATION_UNAVAILABLE" ? "unavailable" : "failed") };
  }
  refresh();
  return { ok: true, message: t("filled", { count: result.data.filled }) };
}
