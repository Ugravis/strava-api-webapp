"use server";

import { type AppSettingKey, MAINTENANCE_TITLES, type MaintenanceTitle, type SetAppSettingRequest } from "@kilotrace/shared";
import type { SetMaintenanceRequest } from "@kilotrace/shared/admin";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { runAdminAction } from "@/lib/admin/actions";

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

export async function setAppSetting(key: AppSettingKey, value: SetAppSettingRequest["value"]): Promise<ActionResult> {
  const body: SetAppSettingRequest = { value };
  return runAdminAction(`/system/settings/${key}`, "PUT", body);
}

/** A number typed in the form; left empty, null (no limit). Checked by the backend against the catalog. */
export async function setNumberSetting(key: AppSettingKey, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const typed = text(formData, "value");
  return setAppSetting(key, typed === "" ? null : Number(typed));
}

export async function resetAppSetting(key: AppSettingKey): Promise<ActionResult> {
  return runAdminAction(`/system/settings/${key}`, "DELETE");
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}
