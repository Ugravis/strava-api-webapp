"use server";

import {
  ADMIN_DISTINCTION_KINDS,
  type AdminDistinctionKind,
  MODERATABLE_FIELDS,
  type ModeratableField,
  type ModerateUserRequest,
  type SuspendUserRequest,
} from "@kilotrace/shared/admin";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/components/admin/action-state";
import { checkedId, reasonOf, runAdminAction } from "@/lib/admin/actions";
import { adminRoutes } from "@/lib/admin/navigation";

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

export async function setDistinction(
  id: string,
  kind: AdminDistinctionKind,
  granted: boolean,
): Promise<ActionResult> {
  if (!ADMIN_DISTINCTION_KINDS.includes(kind)) {
    throw new Error("Invalid distinction");
  }
  return runAdminAction(`/users/${checkedId(id)}/distinctions/${kind}`, granted ? "PUT" : "DELETE");
}
