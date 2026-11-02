"use server";

import {
  type AdminReservedUsername,
  isReservedUsernameCategory,
  type ReservedUsernameCategory,
  type ReserveUsernameRequest,
  type UpdateReservedUsernameRequest,
} from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@/components/admin/action-state";
import { type AdminActionResult, runAdminAction } from "@/lib/admin/actions";
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

/** A reserved username being typed: every field may still be empty. */
export interface ReservedDraft {
  username: string | null;
  category: ReservedUsernameCategory | null;
  note: string | null;
}

/*
 * Actions of the reserved usernames. The backend checks the role (admin),
 * the username and refuses one held by an account; every change is recorded.
 */

/** A username reserved from its draft: its id once created, a refusal under its field. */
export async function createReservedUsername(draft: ReservedDraft): Promise<AdminActionResult & { id?: string }> {
  const t = getAdminTranslations("reservedUsernames.errors");
  const body: ReserveUsernameRequest = {
    username: (draft.username ?? "").trim().toLowerCase(),
    category: isReservedUsernameCategory(draft.category) ? draft.category : "other",
    note: draft.note?.trim() || null,
  };
  const result = await runAdminAction("/reserved-usernames", "POST", body, {
    USERNAME_TAKEN: { field: "username", message: t("taken") },
    USERNAME_RESERVED: { field: "username", message: t("reserved") },
  });
  return result.ok ? { ...result, id: body.username, message: `@${body.username} réservé` } : result;
}

/** A change edited in place: every field sent, `username` when renamed. */
export async function saveReservedUsername(username: string, body: UpdateReservedUsernameRequest): Promise<ActionResult> {
  const t = getAdminTranslations("reservedUsernames.errors");
  const update: UpdateReservedUsernameRequest = {
    ...(body.username !== undefined && { username: body.username.trim().toLowerCase() }),
    category: isReservedUsernameCategory(body.category) ? body.category : "other",
    note: body.note?.trim() || null,
  };
  return runAdminAction(`/reserved-usernames/${encodeURIComponent(username)}`, "PATCH", update, {
    USERNAME_TAKEN: t("taken"),
    USERNAME_RESERVED: t("reserved"),
  });
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
