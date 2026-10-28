import "server-only";
import {
  AdminRole,
  type AdminReservedUsername,
  hasAdminRole,
  RESERVED_USERNAME_CATEGORIES,
  RESERVED_USERNAME_NOTE_MAX_LENGTH,
  type ReservedUsernameCategory,
} from "@kilotrace/shared/admin";
import { USERNAME_MAX_LENGTH, USERNAME_MIN_LENGTH } from "@kilotrace/shared";
import { AtSignIcon, ChevronDownIcon, PlusIcon, Trash2Icon } from "lucide-react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { FormDialog } from "@/components/admin/form-dialog";
import { UserLink } from "@/components/admin/user-link";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminRoles } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { formatDate, formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { releaseUsername, reserveUsername } from "./reserved-actions";

const cell = "px-3 py-2";

const CATEGORY_COLORS: Record<ReservedUsernameCategory, string> = {
  system: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  personality: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  brand: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  offensive: "bg-red-500/15 text-red-700 dark:text-red-300",
  other: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
};

/**
 * Usernames nobody can take, above the users: folded by default so that the
 * list stays in view. Support reads, admins add and release.
 */
export async function ReservedUsernames() {
  const t = getAdminTranslations("users.reserved");
  const [roles, result] = await Promise.all([getAdminRoles(), adminApi<AdminReservedUsername[]>("/reserved-usernames")]);
  const canEdit = hasAdminRole(roles, AdminRole.Admin);

  return (
    <details className="group rounded-xl border">
      <summary className="flex cursor-pointer list-none items-center gap-3 p-3 [&::-webkit-details-marker]:hidden">
        <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted">
          <AtSignIcon className="size-4" aria-hidden />
        </span>
        <span className="min-w-0 flex-1">
          <span className="flex items-baseline gap-2 text-sm font-medium">
            {t("title")}
            {result.ok && <span className="text-xs font-normal text-muted-foreground">{t("count", { count: result.data.length })}</span>}
          </span>
          <span className="block text-xs text-muted-foreground">{t("description")}</span>
        </span>
        <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" aria-hidden />
      </summary>

      <div className="flex flex-col gap-3 border-t p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">{canEdit ? t("hint") : t("readOnly")}</p>
          {canEdit && <ReserveDialog />}
        </div>
        {result.ok ? (
          <ReservedTable entries={result.data} canEdit={canEdit} />
        ) : (
          <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("error")}</p>
        )}
      </div>
    </details>
  );
}

export function ReservedUsernamesSkeleton() {
  return <Skeleton className="h-[3.75rem] w-full rounded-xl" aria-busy />;
}

function CategoryPill({ category }: { category: ReservedUsernameCategory }) {
  return (
    <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", CATEGORY_COLORS[category])}>
      {getAdminTranslations("users.reserved.categories")(category)}
    </span>
  );
}

function ReserveDialog() {
  const t = getAdminTranslations("users.reserved.add");
  const categories = getAdminTranslations("users.reserved.categories");
  return (
    <FormDialog
      action={reserveUsername}
      trigger={{ label: t("trigger"), icon: <PlusIcon />, variant: "default" }}
      title={t("title")}
      description={t("description")}
      submitLabel={t("submit")}
      cancelLabel={getAdminTranslations("common")("cancel")}
      fields={[
        {
          kind: "text",
          name: "username",
          label: t("username"),
          hint: t("usernameHint"),
          required: true,
          maxLength: USERNAME_MAX_LENGTH,
          pattern: `[a-zA-Z0-9_]{${USERNAME_MIN_LENGTH},${USERNAME_MAX_LENGTH}}`,
        },
        {
          kind: "select",
          name: "category",
          label: t("category"),
          defaultValue: "other",
          options: RESERVED_USERNAME_CATEGORIES.map((value) => ({ value, label: categories(value) })),
        },
        { kind: "textarea", name: "note", label: t("note"), hint: t("noteHint"), maxLength: RESERVED_USERNAME_NOTE_MAX_LENGTH },
      ]}
    />
  );
}

function ReservedTable({ entries, canEdit }: { entries: AdminReservedUsername[]; canEdit: boolean }) {
  const t = getAdminTranslations("users.reserved");
  const common = getAdminTranslations("common");
  if (entries.length === 0) {
    return <p className="rounded-xl border border-dashed p-6 text-center text-sm text-muted-foreground">{t("empty")}</p>;
  }
  return (
    // Every column stays, the table scrolling sideways on narrow screens.
    <div className="max-h-80 overflow-auto rounded-xl border">
      <table className="w-full min-w-[44rem] text-sm">
        <thead className="sticky top-0 bg-muted text-left text-xs text-muted-foreground">
          <tr>
            <th className={`${cell} font-medium`}>{t("columns.username")}</th>
            <th className={`${cell} font-medium`}>{t("columns.category")}</th>
            <th className={`${cell} font-medium`}>{t("columns.note")}</th>
            <th className={`${cell} font-medium`}>{t("columns.createdBy")}</th>
            <th className={`${cell} font-medium`}>{t("columns.createdAt")}</th>
            {canEdit && <th className={`${cell} text-right font-medium`}>{t("columns.actions")}</th>}
          </tr>
        </thead>
        <tbody>
          {entries.map((entry) => (
            <tr key={entry.username} className="border-t odd:bg-background even:bg-muted/50">
              <td className={`${cell} font-medium`}>@{entry.username}</td>
              <td className={cell}>
                <CategoryPill category={entry.category} />
              </td>
              <td className={`${cell} max-w-64 text-muted-foreground`}>{entry.note ?? common("none")}</td>
              <td className={cell}>
                <UserLink user={entry.createdBy} fallback={t("initialList")} deleted={t("deletedAuthor")} />
              </td>
              <td className={`${cell} text-muted-foreground`}>
                <time dateTime={entry.createdAt} title={formatDateTime(entry.createdAt)}>
                  {formatDate(entry.createdAt)}
                </time>
              </td>
              {canEdit && (
                <td className={cell}>
                  <div className="flex justify-end">
                    <ActionDialog
                      action={releaseUsername.bind(null, entry.username)}
                      trigger={{ label: t("release.trigger"), icon: <Trash2Icon />, iconOnly: true }}
                      title={t("release.title", { username: entry.username })}
                      description={t("release.description")}
                      submitLabel={t("release.submit")}
                      cancelLabel={common("cancel")}
                      destructive
                    />
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
