"use server";

import { isReservedUsernameCategory, type ReserveUsernameRequest } from "@kilotrace/shared/admin";
import type { ActionResult } from "@/components/admin/action-state";
import { runAdminAction } from "@/lib/admin/actions";
import { getAdminTranslations } from "@/lib/admin/messages";

/*
 * Actions of the reserved usernames. The backend checks the role (admin),
 * the username and refuses one held by an account; every change is recorded.
 */

export async function reserveUsername(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const t = getAdminTranslations("users.reserved.errors");
  const category = formData.get("category");
  const note = String(formData.get("note") ?? "").trim();
  const body: ReserveUsernameRequest = {
    username: String(formData.get("username") ?? "").trim().toLowerCase(),
    category: isReservedUsernameCategory(category) ? category : "other",
    ...(note && { note }),
  };
  return runAdminAction("/reserved-usernames", "POST", body, {
    USERNAME_TAKEN: t("taken"),
    USERNAME_RESERVED: t("reserved"),
  });
}

export async function releaseUsername(username: string): Promise<ActionResult> {
  return runAdminAction(`/reserved-usernames/${encodeURIComponent(username)}`, "DELETE");
}
