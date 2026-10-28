"use server";

import { MAINTENANCE_TITLES, type MaintenanceTitle } from "@kilotrace/shared";
import type { SetMaintenanceRequest, SetSignupsRequest } from "@kilotrace/shared/admin";
import type { ActionResult } from "@/components/admin/action-state";
import { reasonOf, runAdminAction } from "@/lib/admin/actions";

/*
 * Actions of the maintenance page. The backend checks the role and the
 * fields, and records every call.
 */

export async function setMaintenance(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const title = text(formData, "title") as MaintenanceTitle;
  const body: SetMaintenanceRequest = {
    title: MAINTENANCE_TITLES.includes(title) ? title : MAINTENANCE_TITLES[0],
    description: text(formData, "description") || null,
  };
  return runAdminAction("/system/maintenance", "PUT", body);
}

export async function clearMaintenance(): Promise<ActionResult> {
  return runAdminAction("/system/maintenance", "DELETE");
}

export async function setSignups(enabled: boolean): Promise<ActionResult> {
  const body: SetSignupsRequest = { enabled };
  return runAdminAction("/system/signups", "PUT", body);
}

export async function deleteOrphans(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction("/system/uploads/orphans", "DELETE", { reason: reasonOf(formData) ?? "" });
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
