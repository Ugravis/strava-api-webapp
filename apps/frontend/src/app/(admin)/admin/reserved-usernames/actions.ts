"use server";

import {
  type AdminReservedUsername,
  isReservedUsernameCategory,
  type ReserveUsernameRequest,
  type UpdateReservedUsernameRequest,
} from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@/components/admin/action-state";
import { runAdminAction } from "@/lib/admin/actions";
import { getAdminTranslations } from "@/lib/admin/messages";
import { fetchAdminRow, fetchAdminTable } from "@/lib/admin/table";

/** A page of the table of the reserved usernames. */
export async function fetchReservedTable(query: TableQuery): Promise<TablePage<AdminReservedUsername>> {
  return fetchAdminTable<AdminReservedUsername>("/reserved-usernames/table", query);
}

/** A reserved username for its detail, null once released. */
export async function loadReservedUsername(username: string): Promise<AdminReservedUsername | null> {
  return fetchAdminRow<AdminReservedUsername>("/reserved-usernames/table", username, (entry) => entry.username);
}

/*
 * Actions of the reserved usernames. The backend checks the role (admin),
 * the username and refuses one held by an account; every change is recorded.
 */

export async function reserveUsername(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const t = getAdminTranslations("reservedUsernames.errors");
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

export async function updateReservedUsername(username: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const category = formData.get("category");
  const note = String(formData.get("note") ?? "").trim();
  const body: UpdateReservedUsernameRequest = { category: isReservedUsernameCategory(category) ? category : "other", note: note || null };
  return runAdminAction(`/reserved-usernames/${encodeURIComponent(username)}`, "PATCH", body);
}

/** The same, edited in place from the detail. */
export async function saveReservedUsername(username: string, body: UpdateReservedUsernameRequest): Promise<ActionResult> {
  const update: UpdateReservedUsernameRequest = {
    category: isReservedUsernameCategory(body.category) ? body.category : "other",
    note: body.note?.trim() || null,
  };
  return runAdminAction(`/reserved-usernames/${encodeURIComponent(username)}`, "PATCH", update);
}

export async function releaseUsername(username: string): Promise<ActionResult> {
  return runAdminAction(`/reserved-usernames/${encodeURIComponent(username)}`, "DELETE");
}

/** Releases the selection one by one, stopping at the first failure. */
export async function releaseUsernames(usernames: string[]): Promise<ActionResult> {
  let result: ActionResult = { ok: true, message: "" };
  for (const username of usernames) {
    result = await releaseUsername(username);
    if (!result.ok) break;
  }
  return result;
}
