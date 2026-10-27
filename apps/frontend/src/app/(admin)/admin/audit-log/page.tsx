import {
  AdminRole,
  AUDIT_VISIBILITIES,
  type AdminPage,
  type AuditLogEntry,
  type AuditUser,
  hasAdminRole,
} from "@kilotrace/shared/admin";
import { EyeIcon, EyeOffIcon, XIcon } from "lucide-react";
import Link from "next/link";
import { ActionForm } from "@/components/admin/action-form";
import { PanelLink } from "@/components/admin/panel-link";
import { Pagination } from "@/components/admin/pagination";
import { SubmitButton } from "@/components/admin/submit-button";
import { Badge } from "@/components/ui/badge";
import { requireAdminRole } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { formatDateTime } from "@/lib/admin/format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { hrefWith, oneOf, pageOf, param } from "@/lib/admin/url";
import { cn } from "@/lib/utils";
import { setEntryHidden } from "./actions";
import { AUDIT_DOMAINS } from "./domains";

const UUID = /^[0-9a-f-]{36}$/i;
const PANEL_PREFIX = `${adminRoutes.users}/`;

/**
 * A page of the logs, the latest first. Append-only: the super-admins may
 * only mask an entry from the other roles.
 */
export default async function AdminAuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  const roles = await requireAdminRole(AdminRole.Admin);
  const superAdmin = hasAdminRole(roles, AdminRole.SuperAdmin);
  const t = getAdminTranslations("auditLog");
  const common = getAdminTranslations("common");
  const params = await searchParams;

  const domain = oneOf(param(params, "action"), AUDIT_DOMAINS);
  const visibility = superAdmin ? oneOf(param(params, "visibility"), AUDIT_VISIBILITIES) : "all";
  const target = param(params, "target");
  const actor = param(params, "actor");
  const current = {
    q: param(params, "q")?.trim().slice(0, 100) || undefined,
    action: domain === "all" ? undefined : domain,
    visibility: visibility === "all" ? undefined : visibility,
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
  const cell = "px-3 py-2 align-top";

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
            <thead className="bg-muted/50 text-left text-xs text-muted-foreground">
              <tr>
                <th className={`${cell} font-medium whitespace-nowrap`}>{t("columns.date")}</th>
                <th className={`${cell} font-medium`}>{t("columns.actor")}</th>
                <th className={`${cell} font-medium`}>{t("columns.target")}</th>
                <th className={`${cell} font-medium`}>{t("columns.action")}</th>
                <th className={`${cell} font-medium`}>{t("columns.reason")}</th>
                {superAdmin && <th className={`${cell} text-right font-medium`}>{t("columns.actions")}</th>}
              </tr>
            </thead>
            <tbody>
              {list.items.map((entry) => {
                const hidden = Boolean(entry.hiddenAt);
                return (
                  <tr key={entry.id} className={cn("border-t", hidden && "bg-muted/40 text-muted-foreground")}>
                    <td className={`${cell} whitespace-nowrap text-muted-foreground`}>
                      <time dateTime={entry.createdAt}>{formatDateTime(entry.createdAt)}</time>
                    </td>
                    <td className={`${cell} whitespace-nowrap`}>
                      <UserLink user={entry.actor} fallback={t("system")} deleted={t("deleted")} />
                    </td>
                    <td className={`${cell} whitespace-nowrap`}>
                      <UserLink user={entry.targetUser} fallback="—" deleted={t("deleted")} />
                    </td>
                    <td className={cell}>
                      <ActionLabel entry={entry} />
                    </td>
                    <td className={`${cell} max-w-80 whitespace-pre-line`}>{entry.reason ?? "—"}</td>
                    {superAdmin && (
                      <td className={`${cell} text-right`}>
                        <ActionForm action={setEntryHidden.bind(null, entry.id, !hidden)}>
                          <SubmitButton size="icon-sm" variant="ghost" aria-label={t(hidden ? "show" : "hide")} title={t(hidden ? "show" : "hide")}>
                            {hidden ? <EyeIcon /> : <EyeOffIcon />}
                          </SubmitButton>
                        </ActionForm>
                      </td>
                    )}
                  </tr>
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

/** A user of an entry, opening their panel while the account exists. */
function UserLink({ user, fallback, deleted }: { user: AuditUser | null; fallback: string; deleted: string }) {
  if (!user) {
    return <span className="text-muted-foreground">{fallback}</span>;
  }
  if (!user.username) {
    return <span className="text-muted-foreground italic">{deleted}</span>;
  }
  return (
    <PanelLink
      href={adminRoutes.user(user.id)}
      panelPrefix={PANEL_PREFIX}
      className="font-medium text-blue-600 underline-offset-2 hover:underline dark:text-blue-400"
    >
      {user.displayName ?? `@${user.username}`}
    </PanelLink>
  );
}

/** The action in words, with its parameters and its failure if any. */
function ActionLabel({ entry }: { entry: AuditLogEntry }) {
  const t = getAdminTranslations("auditLog");
  const actions = getAdminTranslations("auditLog.actions");
  const fields = getAdminTranslations("user.moderatedFields");
  const kinds = getAdminTranslations("user.distinctions");
  const key = entry.action as Parameters<typeof actions>[0];
  const { until, fields: reset, kind } = entry.details ?? {};
  const details = [
    typeof until === "string" && t("details.until", { date: formatDateTime(until) }),
    Array.isArray(reset) &&
      t("details.fields", {
        fields: reset.map((field) => (fields.has(field as never) ? fields(field as never) : String(field))).join(", "),
      }),
    typeof kind === "string" && t("details.kind", { kind: kinds.has(kind as never) ? kinds(kind as never) : kind }),
  ].filter(Boolean);
  return (
    <span className="flex flex-col gap-0.5">
      <span className="flex flex-wrap items-center gap-1.5">
        {actions.has(key) ? actions(key) : entry.action}
        {!entry.succeeded && <Badge variant="destructive">{t("failed", { status: entry.status ?? "—" })}</Badge>}
      </span>
      {details.length > 0 && <span className="text-xs text-muted-foreground">{details.join(" · ")}</span>}
    </span>
  );
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
