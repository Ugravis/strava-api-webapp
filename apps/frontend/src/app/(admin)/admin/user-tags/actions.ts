"use server";

import {
  ADMIN_BADGE_SLUG,
  type CreateUserTagRequest,
  type ReorderRequest,
  type UpdateUserTagRequest,
} from "@kilotrace/shared/admin";
import type { ActionResult } from "@/components/admin/action-state";
import { reasonOf, runAdminAction } from "@/lib/admin/actions";
import { getAdminTranslations } from "@/lib/admin/messages";

/*
 * Actions of the user tags page, bound to their ids by the page. The
 * backend checks the permission and the fields, and records every call.
 */

export async function createUserTag(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: CreateUserTagRequest = { id: text(formData, "id"), ...userTagOf(formData) };
  return runAdminAction("/user-tags", "POST", body, {
    ID_TAKEN: getAdminTranslations("userTags.errors")("idTaken"),
  });
}

export async function updateUserTag(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: UpdateUserTagRequest = userTagOf(formData);
  return runAdminAction(`/user-tags/${checkedSlug(id)}`, "PATCH", body);
}

export async function deleteUserTag(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction(
    `/user-tags/${checkedSlug(id)}`,
    "DELETE",
    { reason: reasonOf(formData) ?? "" },
    { SYSTEM_USER_TAG: getAdminTranslations("userTags.errors")("system") },
  );
}

export async function reorderUserTags(ids: string[]): Promise<ActionResult> {
  const body: ReorderRequest = { ids: ids.map(checkedSlug) };
  return runAdminAction("/user-tags/order", "PUT", body);
}

/** A slug posted by the page, checked before it reaches a URL. */
function checkedSlug(id: string): string {
  if (typeof id !== "string" || !ADMIN_BADGE_SLUG.test(id)) {
    throw new Error("Invalid id");
  }
  return id;
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

function userTagOf(formData: FormData): UpdateUserTagRequest {
  return {
    name: text(formData, "name"),
    description: text(formData, "description") || null,
    icon: text(formData, "icon"),
    color: text(formData, "color") || null,
  };
}
