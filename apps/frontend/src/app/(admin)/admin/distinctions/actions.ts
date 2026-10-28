"use server";

import {
  ADMIN_BADGE_SLUG,
  type CreateDistinctionRequest,
  type ReorderRequest,
  type UpdateDistinctionRequest,
} from "@kilotrace/shared/admin";
import type { ActionResult } from "@/components/admin/action-state";
import { reasonOf, runAdminAction } from "@/lib/admin/actions";
import { getAdminTranslations } from "@/lib/admin/messages";

/*
 * Actions of the distinctions page, bound to their ids by the page. The
 * backend checks the permission and the fields, and records every call.
 */

export async function createDistinction(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: CreateDistinctionRequest = { id: text(formData, "id"), ...distinctionOf(formData) };
  return runAdminAction("/distinctions", "POST", body, {
    ID_TAKEN: getAdminTranslations("distinctions.errors")("idTaken"),
  });
}

export async function updateDistinction(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: UpdateDistinctionRequest = distinctionOf(formData);
  return runAdminAction(`/distinctions/${checkedSlug(id)}`, "PATCH", body);
}

export async function deleteDistinction(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction(
    `/distinctions/${checkedSlug(id)}`,
    "DELETE",
    { reason: reasonOf(formData) ?? "" },
    { SYSTEM_DISTINCTION: getAdminTranslations("distinctions.errors")("system") },
  );
}

export async function reorderDistinctions(ids: string[]): Promise<ActionResult> {
  const body: ReorderRequest = { ids: ids.map(checkedSlug) };
  return runAdminAction("/distinctions/order", "PUT", body);
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

function distinctionOf(formData: FormData): UpdateDistinctionRequest {
  return {
    name: text(formData, "name"),
    description: text(formData, "description") || null,
    icon: text(formData, "icon"),
    color: text(formData, "color") || null,
  };
}
