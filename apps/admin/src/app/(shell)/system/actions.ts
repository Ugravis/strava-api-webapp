"use server";

import {
  type AdminAppSettingsResponse,
  APP_SETTING_KEYS,
  APP_SETTINGS,
  type AppSettingKey,
  isAppSettingKey,
  MAINTENANCE_TITLES,
  type MaintenanceTitle,
  type SetAppSettingRequest,
} from "@kilotrace/shared";
import type { SetMaintenanceRequest } from "@kilotrace/shared/admin";
import { type MemoryTableSpec, serveTablePage, type TablePage, type TableQuery } from "@kilotrace/shared/table";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { runAdminAction } from "@/lib/admin/actions";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import type { SettingRow } from "./settings-types";

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

export async function resetAppSetting(key: AppSettingKey): Promise<ActionResult> {
  return runAdminAction(`/system/settings/${key}`, "DELETE");
}

function text(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

/** Read in the order of the catalog, searched by their words, grouped by category. */
const SETTINGS_SPEC: MemoryTableSpec<SettingRow> = {
  search: (row) => `${row.label} ${row.description}`,
  sorts: { setting: (row) => APP_SETTING_KEYS.indexOf(row.key), updatedAt: (row) => row.updatedAt },
  groupings: { category: (row) => row.category },
};

/** The settings, with their texts: few, read whole, served in pages here. */
export async function fetchSettingsTable(query: TableQuery): Promise<TablePage<SettingRow>> {
  return serveTablePage(await settingRows(), SETTINGS_SPEC, query);
}

/** A setting for its detail, null for an unknown key. */
export async function loadSetting(key: string): Promise<SettingRow | null> {
  if (!isAppSettingKey(key)) return null;
  return (await settingRows()).find((row) => row.key === key) ?? null;
}

async function settingRows(): Promise<SettingRow[]> {
  const result = await adminApi<AdminAppSettingsResponse>("/system/settings");
  if (!result.ok) throw new Error(`Admin settings: ${result.status}`);
  const items = getAdminTranslations("system.settings.items");
  const categories = getAdminTranslations("system.settings.categories");
  return result.data.map((setting) => {
    const { category, rule } = APP_SETTINGS[setting.key];
    const side = (on: boolean) => {
      const step = `${setting.key}.${on ? "on" : "off"}`;
      return {
        title: items(`${step}.title` as never),
        description: items(`${step}.description` as never),
        confirmLabel: items(`${step}.submit` as never),
        destructive: !on,
      };
    };
    return {
      ...setting,
      category,
      categoryTitle: categories(`${category}.title`),
      label: items(`${setting.key}.label` as never),
      description: items(`${setting.key}.description` as never),
      confirm: rule.type === "boolean" ? { off: side(false), on: side(true) } : null,
    };
  });
}
