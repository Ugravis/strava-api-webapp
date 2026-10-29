import {
  AUDIT_ORDERS,
  AUDIT_VISIBILITIES,
  type AdminPage,
  type AuditLogEntry,
} from "@kilotrace/shared/admin";
import { ArrowRightIcon, EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { ActionForm } from "@/components/admin/action-form";
import { DialogRow } from "@/components/admin/dialog-row";
import { SortHeader } from "@/components/admin/list-navigation";
import { Pagination } from "@/components/admin/pagination";
import { SubmitButton } from "@/components/admin/submit-button";
import { UserLink } from "@/components/admin/user-link";
import { Badge } from "@/components/ui/badge";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { hrefWith, oneOf, pageOf, param } from "@/lib/admin/url";
import { cn } from "@/lib/utils";
import { setEntryHidden } from "./actions";
import { AUDIT_DOMAINS } from "./domains";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * A page of the logs. Append-only: the super-admins may only mask an entry
 * from the other roles. A row opens the whole entry.
 */
export default async function AdminAuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  const { permissions } = await requireAdminMember();
  const superAdmin = permissions.includes("audit.hide");
  const t = getAdminTranslations("auditLog");
  const common = getAdminTranslations("common");
  const params = await searchParams;

  const domain = oneOf(param(params, "action"), AUDIT_DOMAINS);
  const visibility = superAdmin ? oneOf(param(params, "visibility"), AUDIT_VISIBILITIES) : "all";
  const order = oneOf(param(params, "order"), AUDIT_ORDERS);
  const target = param(params, "target");
  const actor = param(params, "actor");
  const current = {
    q: param(params, "q")?.trim().slice(0, 100) || undefined,
    action: domain === "all" ? undefined : domain,
    visibility: visibility === "all" ? undefined : visibility,
    order: order === "desc" ? undefined : order,
    target: target && UUID.test(target) ? target : undefined,
    actor: actor && UUID.test(actor) ? actor : undefined,
  };
  const page = pageOf(param(params, "page"));
  const href = (changes: Record<string, string | null>) => hrefWith(adminRoutes.auditLog, current, changes);

  const query = new URLSearchParams(
    Object.entries({ ...current, page: String(page) }).filter((entry): entry is [string, string] => Boolean(entry[1])),
  );
  const result = await adminApi<AdminPage<AuditLogEntry>>(`/audit-log?${query}`);
  const list = result.ok ? result.data : { items: [], total: 0, page, pageSize: 1 };
  const pages = Math.max(1, Math.ceil(list.total / list.pageSize));
  // Named after the entries themselves, when one of them shows the user.
  const nameOf = (id: string) => {
    const user = list.items.flatMap((entry) => [entry.actor, entry.targetUser]).find((each) => each?.id === id);
    return user?.displayName ?? (user?.username ? `@${user.username}` : id.slice(0, 8));
  };
  const cell = "px-3 py-2 whitespace-nowrap";

  return (
    <div className="flex flex-col gap-3">
      {(current.target || current.actor) && (
        <div className="flex flex-wrap gap-2">
          {current.target && (
            <FilterBadge label={t("filters.target", { name: nameOf(current.target) })} clear={t("filters.clear")} href={href({ target: null })} />
          )}
          {current.actor && (
            <FilterBadge label={t("filters.actor", { name: nameOf(current.actor) })} clear={t("filters.clear")} href={href({ actor: null })} />
          )}
        </div>
      )}

      {list.items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        // Every column stays, the table scrolling sideways on narrow screens.
        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full min-w-[56rem] text-sm">
            <thead className="bg-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className={cell}>
                  <SortHeader
                    label={t("columns.date")}
                    param="order"
                    defaultValue="desc"
                    asc="asc"
                    desc="desc"
                    first="desc"
                    basePath={adminRoutes.auditLog}
                  />
                </th>
                <th className={`${cell} font-medium`}>{t("columns.users")}</th>
                <th className={`${cell} font-medium`}>{t("columns.action")}</th>
                <th className={`${cell} font-medium`}>{t("columns.reason")}</th>
                {superAdmin && <th className={`${cell} text-right font-medium`}>{t("columns.actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {list.items.map((entry) => {
                const hidden = Boolean(entry.hiddenAt);
                return (
                  <DialogRow
                    key={entry.id}
                    label={t("open", { date: formatDateTime(entry.createdAt) })}
                    title={t("entry.title")}
                    details={<EntryDetails entry={entry} />}
                    className={cn("border-t transition-colors odd:bg-background even:bg-muted/50 hover:bg-muted", hidden && "text-muted-foreground")}
                  >
                    <td className={`${cell} text-muted-foreground`}>
                      <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                    </td>
                    <td className={cell}>
                      <span className="flex items-center gap-2">
                        <UserLink user={entry.actor} fallback={t("system")} deleted={t("deleted")} />
                        {entry.targetUser && (
                          <>
                            <ArrowRightIcon className="size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden />
                            <UserLink user={entry.targetUser} fallback="—" deleted={t("deleted")} />
                          </>
                        )}
                      </span>
                    </td>
                    <td className={cell}>
                      <span className="flex items-center gap-1.5">
                        <ActionName entry={entry} />
                        {!entry.succeeded && <Badge variant="destructive">{t("failed", { status: entry.status ?? "—" })}</Badge>}
                        {hidden && <EyeOffIcon className="size-3.5 text-muted-foreground" aria-label={t("hidden")} />}
                      </span>
                    </td>
                    <td className={`${cell} max-w-72 truncate`}>{entry.reason ?? "—"}</td>
                    {superAdmin && (
                      <td className={`${cell} text-right`}>
                        <ActionForm action={setEntryHidden.bind(null, entry.id, !hidden)}>
                          <SubmitButton size="icon-sm" variant="ghost" aria-label={t(hidden ? "show" : "hide")} title={t(hidden ? "show" : "hide")}>
                            {hidden ? <EyeIcon /> : <EyeOffIcon />}
                          </SubmitButton>
                        </ActionForm>
                      </td>
                    )}
                  </DialogRow>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      <Pagination
        page={page}
        pages={pages}
        hrefFor={(each) => href({ page: each > 1 ? String(each) : null })}
        labels={{
          navigation: common("pagination"),
          previous: common("previous"),
          next: common("next"),
          status: common("page", { page, pages }),
        }}
      />
    </div>
  );
}

/** Everything about an entry, in the dialog of its row. */
function EntryDetails({ entry }: { entry: AuditLogEntry }) {
  const t = getAdminTranslations("auditLog");
  const details = detailsOf(entry);
  const status = entry.status ?? "—";
  return (
    <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
      <Item label={t("entry.date")}>{formatDateTime(entry.createdAt)}</Item>
      <Item label={t("entry.actor")}>
        <UserLink user={entry.actor} fallback={t("system")} deleted={t("deleted")} />
      </Item>
      <Item label={t("entry.target")}>
        {entry.targetUser ? (
          <UserLink user={entry.targetUser} fallback="—" deleted={t("deleted")} />
        ) : (
          <span className="text-muted-foreground">{entry.targetId ? `${entry.targetType} ${entry.targetId}` : "—"}</span>
        )}
      </Item>
      <Item label={t("entry.action")}>
        <ActionName entry={entry} /> <code className="text-xs text-muted-foreground">{entry.action}</code>
      </Item>
      {details.length > 0 && (
        <Item label={t("entry.details")}>
          {details.map((line) => (
            <span key={line} className="block">
              {line}
            </span>
          ))}
        </Item>
      )}
      <Item label={t("entry.reason")}>
        <span className="whitespace-pre-line">{entry.reason ?? "—"}</span>
      </Item>
      <Item label={t("entry.outcome")}>
        {entry.succeeded ? t("entry.succeeded", { status }) : <span className="text-destructive">{t("entry.failed", { status })}</span>}
      </Item>
      {entry.hiddenAt !== undefined && (
        <Item label={t("entry.visibility")}>
          {entry.hiddenAt ? t("entry.hidden", { date: formatDateTime(entry.hiddenAt) }) : t("entry.visible")}
        </Item>
      )}
      <Item label={t("entry.id")}>
        <code className="text-xs break-all">{entry.id}</code>
      </Item>
    </dl>
  );
}

function Item({ label, children }: { label: string; children: ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="min-w-0">{children}</dd>
    </>
  );
}

function ActionName({ entry }: { entry: AuditLogEntry }) {
  const actions = getAdminTranslations("auditLog.actions");
  const key = entry.action as Parameters<typeof actions>[0];
  return <>{actions.has(key) ? actions(key) : entry.action}</>;
}

/** Parameters of the action recorded with it, in words. */
function detailsOf(entry: AuditLogEntry): string[] {
  const t = getAdminTranslations("auditLog.details");
  const fields = getAdminTranslations("user.moderatedFields");
  const kinds = getAdminTranslations("user.userTags");
  const titles = getAdminTranslations("system.maintenance.titles");
  const categories = getAdminTranslations("users.reserved.categories");
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

function FilterBadge({ label, clear, href }: { label: string; clear: string; href: string }) {
  return (
    <Badge variant="secondary" className="h-7 gap-1 pr-1">
      {label}
      <Link href={href} scroll={false} aria-label={clear} className="rounded-full p-0.5 hover:bg-background">
        <XIcon />
      </Link>
    </Badge>
  );
}
