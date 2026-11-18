import { checkField, type FieldRule } from "../rules";

/**
 * Settings of the whole site, changed from the maintenance page of the back
 * office without a redeploy. Written once here: the backend stores only the
 * values changed, the default standing in for the others.
 */

/** Sections of the settings, in the order of the page. */
export const APP_SETTING_CATEGORIES = ["access", "profiles", "strava"] as const;
export type AppSettingCategory = (typeof APP_SETTING_CATEGORIES)[number];

/** The value of every setting. */
export interface AppSettingValues {
  /** Creation of accounts, by every method. */
  signupsEnabled: boolean;
  /** Sign-in, sign-up and password reset by email on the public site. */
  emailSignInEnabled: boolean;
  /** Sign-ups close by themselves once the site holds this many accounts; null for no cap. */
  maxAccounts: number | null;
  /** Second part of the profiles: tiles, stations and pinned badges. */
  profileShowcaseEnabled: boolean;
  /** Badges a user pins on their profile at most; already pinned ones stay when lowered. */
  pinnedBadgesMax: number;
  /** Imports and refreshes from Strava; webhook events wait in the queue while off. */
  stravaSyncEnabled: boolean;
}

export type AppSettingKey = keyof AppSettingValues;

interface AppSettingDefinition<K extends AppSettingKey> {
  category: AppSettingCategory;
  rule: FieldRule;
  default: AppSettingValues[K];
}

export const APP_SETTINGS: { [K in AppSettingKey]: AppSettingDefinition<K> } = {
  signupsEnabled: { category: "access", rule: { type: "boolean" }, default: true },
  emailSignInEnabled: { category: "access", rule: { type: "boolean" }, default: true },
  maxAccounts: { category: "access", rule: { type: "number", integer: true, min: 1, max: 1_000_000, unit: "comptes" }, default: null },
  profileShowcaseEnabled: { category: "profiles", rule: { type: "boolean" }, default: true },
  pinnedBadgesMax: { category: "profiles", rule: { type: "number", required: true, integer: true, min: 1, max: 12, unit: "badges" }, default: 5 },
  stravaSyncEnabled: { category: "strava", rule: { type: "boolean" }, default: true },
};

export const APP_SETTING_KEYS = Object.keys(APP_SETTINGS) as AppSettingKey[];

export function isAppSettingKey(value: unknown): value is AppSettingKey {
  return typeof value === "string" && Object.hasOwn(APP_SETTINGS, value);
}

/** Why `value` cannot be stored for `key`, or null. */
export function checkAppSetting(key: AppSettingKey, value: unknown): string | null {
  const { rule } = APP_SETTINGS[key];
  if (rule.type === "boolean") return typeof value === "boolean" ? null : "Oui ou non attendu.";
  if (value === null && rule.required) return "Champ obligatoire.";
  return checkField(rule, value);
}

/** A setting as the back office shows it. */
export interface AdminAppSetting<K extends AppSettingKey = AppSettingKey> {
  key: K;
  value: AppSettingValues[K];
  /** Value used while none is stored: the catalog's, or the environment's. */
  defaultValue: AppSettingValues[K];
  /** When it was last changed, ISO 8601; null while the default applies. */
  updatedAt: string | null;
}

/** `GET /api/admin/settings`, in the order of the catalog. */
export type AdminAppSettingsResponse = AdminAppSetting[];

/** `PUT /api/admin/settings/:key`; `DELETE` on it puts the default back. */
export interface SetAppSettingRequest {
  value: boolean | number | null;
}
