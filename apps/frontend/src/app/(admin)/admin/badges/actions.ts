"use server";

import {
  ADMIN_BADGE_FAMILIES,
  ADMIN_BADGE_METRICS,
  ADMIN_BADGE_SLUG,
  type AdminBadgeFamily,
  type AdminBadgeMetric,
  type CreateBadgeRequest,
  type CreateBadgeThemeRequest,
  type ReorderRequest,
  type SetBadgeActiveRequest,
  type UpdateBadgeRequest,
  type UpdateBadgeThemeRequest,
} from "@kilotrace/shared/admin";
import type { ActionResult } from "@/components/admin/action-state";
import { reasonOf, runAdminAction } from "@/lib/admin/actions";
import { scaleOf } from "./units";

/*
 * Actions of the badges page, bound to their ids by the page. The backend
 * checks the role and the fields, and records every call.
 */

export async function createBadge(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: CreateBadgeRequest = { id: text(formData, "id"), ...badgeOf(formData) };
  return runAdminAction("/badges", "POST", body);
}

export async function updateBadge(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: UpdateBadgeRequest = badgeOf(formData);
  return runAdminAction(`/badges/${checkedSlug(id)}`, "PATCH", body);
}

export async function setBadgeActive(id: string, active: boolean): Promise<ActionResult> {
  const body: SetBadgeActiveRequest = { active };
  return runAdminAction(`/badges/${checkedSlug(id)}/active`, "PUT", body);
}

export async function deleteBadge(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction(`/badges/${checkedSlug(id)}`, "DELETE", { reason: reasonOf(formData) ?? "" });
}

export async function reorderBadges(ids: string[]): Promise<ActionResult> {
  const body: ReorderRequest = { ids: ids.map(checkedSlug) };
  return runAdminAction("/badges/order", "PUT", body);
}

export async function createTheme(_: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: CreateBadgeThemeRequest = { id: text(formData, "id"), name: text(formData, "name") };
  return runAdminAction("/badge-themes", "POST", body);
}

export async function updateTheme(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  const body: UpdateBadgeThemeRequest = { name: text(formData, "name") };
  return runAdminAction(`/badge-themes/${checkedSlug(id)}`, "PATCH", body);
}

export async function deleteTheme(id: string, _: ActionResult | null, formData: FormData): Promise<ActionResult> {
  return runAdminAction(`/badge-themes/${checkedSlug(id)}`, "DELETE", { reason: reasonOf(formData) ?? "" });
}

export async function reorderThemes(ids: string[]): Promise<ActionResult> {
  const body: ReorderRequest = { ids: ids.map(checkedSlug) };
  return runAdminAction("/badge-themes/order", "PUT", body);
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

/** The fields of the form, amounts converted from the units shown to the stored ones. */
function badgeOf(formData: FormData): UpdateBadgeRequest {
  const metric = text(formData, "metric") as AdminBadgeMetric;
  const family = text(formData, "family") as AdminBadgeFamily;
  const scale = ADMIN_BADGE_METRICS.includes(metric) ? scaleOf(metric) : 1;
  const tiers = text(formData, "tiers")
    .split(/[\s;]+/)
    .filter(Boolean)
    .map((value) => amountOf(value, scale));
  const themeId = text(formData, "themeId");
  const color = text(formData, "backgroundColor");
  return {
    metric,
    family: ADMIN_BADGE_FAMILIES.includes(family) ? family : "all",
    target: amountOf(text(formData, "target"), scale),
    tiers: tiers.length > 0 ? tiers : null,
    name: text(formData, "name"),
    description: text(formData, "description"),
    themeId: themeId || null,
    icon: text(formData, "icon"),
    backgroundColor: color || null,
  };
}

/** An amount typed in the unit shown, a comma or a dot for decimals; NaN is refused by the backend. */
function amountOf(value: string, scale: number): number {
  const amount = Number(value.replace(",", ".")) * scale;
  return Math.round(amount * 1000) / 1000;
}
