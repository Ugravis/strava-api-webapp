import "server-only";
import type { FillTranslationsResponse, TargetLocale, UpdateTranslationRequest } from "@kilotrace/shared";
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

/** The fields left empty in every language machine-translated by DeepL; those typed are kept. */
export async function fillTranslations(base: string): Promise<ActionResult> {
  const t = getAdminTranslations("translations");
  const result = await adminApi<FillTranslationsResponse>(`${base}/translations/fill`, "POST").catch(() => null);
  if (!result?.ok) {
    return { ok: false, message: t(result?.code === "TRANSLATION_UNAVAILABLE" ? "unavailable" : "failed") };
  }
  refresh();
  return { ok: true, message: t("filled", { count: result.data.filled }) };
}
