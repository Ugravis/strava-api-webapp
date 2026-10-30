"use server";

import {
  ADMIN_BADGE_SLUG,
  MODERATABLE_FIELDS,
  type ModeratableField,
  type AdminUserSummary,
  type ModerateUserRequest,
  type SuspendUserRequest,
} from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/action-state";
import { checkedId, reasonOf, runAdminAction } from "@/lib/admin/actions";
import { adminRoutes } from "@/lib/admin/navigation";
import { fetchAdminTable } from "@/lib/admin/table";

/** A page of the table of the accounts. */
export async function fetchUsersTable(query: TableQuery): Promise<TablePage<AdminUserSummary>> {
  return fetchAdminTable<AdminUserSummary>("/users/table", query);
}

/*
 * Actions of the user panel, bound to the user id by the page. The backend
 * checks the role, the target and the reason, and records every call.
 */

export async function suspendUser(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const until = formData.get("until");
  const body: SuspendUserRequest = {
    reason: reasonOf(formData) ?? "",
    ...(typeof until === "string" && until && { until }),
  };
  return runAdminAction(`/users/${checkedId(id)}/suspension`, "PUT", body);
}

export async function liftSuspension(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction(`/users/${checkedId(id)}/suspension`, "DELETE", { reason: reasonOf(formData) });
}

export async function revokeSessions(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction(`/users/${checkedId(id)}/sessions`, "DELETE", { reason: reasonOf(formData) });
}

export async function unlinkStrava(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction(`/users/${checkedId(id)}/strava`, "DELETE", { reason: reasonOf(formData) ?? "" });
}

export async function moderateUser(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const fields = formData
    .getAll("fields")
    .filter((field): field is ModeratableField => MODERATABLE_FIELDS.includes(field as ModeratableField));
  const body: ModerateUserRequest = { fields, reason: reasonOf(formData) ?? "" };
  return runAdminAction(`/users/${checkedId(id)}/moderation`, "POST", body);
}

/** Back to the list once done: the panel of the account would be empty. */
export async function deleteUser(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const result = await runAdminAction(`/users/${checkedId(id)}`, "DELETE", { reason: reasonOf(formData) ?? "" });
  if (result.ok) {
    redirect(adminRoutes.users);
  }
  return result;
}

export async function setUserTag(
  id: string,
  kind: string,
  granted: boolean,
): Promise<ActionResult> {
  if (typeof kind !== "string" || !ADMIN_BADGE_SLUG.test(kind)) {
    throw new Error("Invalid userTag");
  }
  return runAdminAction(`/users/${checkedId(id)}/user-tags/${kind}`, granted ? "PUT" : "DELETE");
}
