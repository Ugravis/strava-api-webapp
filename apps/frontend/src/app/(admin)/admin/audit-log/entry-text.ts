import "server-only";
import type { AuditLogEntry } from "@kilotrace/shared/admin";
import { formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import type { AuditRow } from "./audit-row";

/** The entries with their action and parameters in words. */
export function withTexts(entries: AuditLogEntry[]): AuditRow[] {
  const actions = getAdminTranslations("auditLog.actions");
  return entries.map((entry) => {
    const key = entry.action as Parameters<typeof actions>[0];
    return { ...entry, label: actions.has(key) ? actions(key) : entry.action, lines: detailsOf(entry) };
  });
}

/** Parameters of the action recorded with it, in words. */
function detailsOf(entry: AuditLogEntry): string[] {
  const t = getAdminTranslations("auditLog.details");
  const fields = getAdminTranslations("user.moderatedFields");
  const kinds = getAdminTranslations("user.userTags");
  const titles = getAdminTranslations("system.maintenance.titles");
  const categories = getAdminTranslations("reservedUsernames.categories");
  const { until, fields: reset, kind, name, active, title, description, enabled, username, category } = entry.details ?? {};
  return [
    typeof until === "string" && t("until", { date: formatDateTime(until) }),
    Array.isArray(reset) &&
      t("fields", {
        fields: reset.map((field) => (fields.has(field as never) ? fields(field as never) : String(field))).join(", "),
      }),
    typeof kind === "string" && t("kind", { kind: kinds.has(kind as never) ? kinds(kind as never) : kind }),
    typeof name === "string" && t("name", { name }),
    typeof active === "boolean" && t("active", { active: String(active) }),
    typeof title === "string" && t("title", { title: titles.has(title as never) ? titles(title as never) : title }),
    typeof description === "string" && t("description", { description }),
    typeof enabled === "boolean" && t("signups", { enabled: String(enabled) }),
    typeof username === "string" && t("username", { username }),
    typeof category === "string" &&
      t("category", { category: categories.has(category as never) ? categories(category as never) : category }),
  ].filter((line): line is string => Boolean(line));
}
