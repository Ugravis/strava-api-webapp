"use server";

import {
  ADMIN_BADGE_SLUG,
  MODERATABLE_FIELDS,
  type AdminPage,
  type AdminPermission,
  type AdminUserDetail,
  type AdminUserTag,
  type AdminUserTagLook,
  type AuditLogEntry,
  type ModeratableField,
  type AdminUserSummary,
  type ModerateUserRequest,
  type SuspendUserRequest,
} from "@kilotrace/shared/admin";
import type { TablePage, TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@/components/admin/action-state";
import { getAdminMe } from "@/lib/admin/access";
import { checkedId, reasonOf, runAdminAction } from "@/lib/admin/actions";
import { adminApi } from "@/lib/admin/api";
import { adminRoutes } from "@/lib/admin/navigation";
import { type ActRefusal, actRefusal } from "@/lib/admin/permissions";
import { fetchAdminTable } from "@/lib/admin/table";
import type { AuditRow } from "../audit-log/audit-row";
import { withTexts } from "../audit-log/entry-text";

/** A page of the table of the accounts. */
export async function fetchUsersTable(query: TableQuery): Promise<TablePage<AdminUserSummary>> {
  return fetchAdminTable<AdminUserSummary>("/users/table", query);
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HISTORY_SIZE = 5;

/** Everything the detail of an account shows, and what the current member may do on it. */
export interface UserDetailData {
  user: AdminUserDetail;
  /** The buttons are only not offered: the backend checks again. */
  permissions: AdminPermission[];
  refusal: ActRefusal | null;
  /** Every tag, in the order of the catalog. */
  catalog: AdminUserTagLook[];
  history: { entries: AuditRow[]; total: number; href: string };
}

/** The detail of an account, null when it is gone. */
export async function loadUserDetail(id: string): Promise<UserDetailData | null> {
  if (!UUID.test(id)) return null;
  const [me, result, catalog, history] = await Promise.all([
    getAdminMe(),
    adminApi<AdminUserDetail>(`/users/${id}`),
    adminApi<AdminUserTag[]>("/user-tags"),
    adminApi<AdminPage<AuditLogEntry>>(`/audit-log?target=${id}`),
  ]);
  if (!result.ok) {
    if (result.status === 404) return null;
    throw new Error(`User ${result.status}`);
  }
  if (!me) throw new Error("No member");
  const user = result.data;
  return {
    user,
    permissions: me.permissions,
    refusal: actRefusal(me, user),
    catalog: catalog.ok ? catalog.data : user.userTags,
    history: {
      entries: history.ok ? withTexts(history.data.items.slice(0, HISTORY_SIZE)) : [],
      total: history.ok ? history.data.total : 0,
      href: `${adminRoutes.auditLog}?target=${id}`,
    },
  };
}

/*
 * Actions of the detail of an account, bound to the user id by the page. The backend
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

/** The page closes the panel once done: the account is gone. */
export async function deleteUser(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction(`/users/${checkedId(id)}`, "DELETE", { reason: reasonOf(formData) ?? "" });
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
