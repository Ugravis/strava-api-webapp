import {
  AdminRole,
  AUDIT_OUTCOMES,
  AUDIT_VISIBILITIES,
  type AdminPage,
  type AuditLogEntry,
  hasAdminRole,
} from "@kilotrace/shared/admin";
import { XIcon } from "lucide-react";
import Link from "next/link";
import { LinkPills } from "@/components/admin/link-pills";
import { Pagination } from "@/components/admin/pagination";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdminRole } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { hrefWith, oneOf, pageOf, param } from "@/lib/admin/url";
import { AuditEntryItem } from "./audit-entry";

/** Domains of the actions, matched by the start of their name. */
const DOMAINS = ["all", "users.", "roles.", "audit."] as const;
const UUID = /^[0-9a-f-]{36}$/i;

/**
 * The audit log, the latest first, filtered in the URL. Append-only: the
 * super-admins may only mask an entry from the other roles.
 */
export default async function AdminAuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  const roles = await requireAdminRole(AdminRole.Admin);
  const superAdmin = hasAdminRole(roles, AdminRole.SuperAdmin);
  const t = getAdminTranslations("auditLog");
  const common = getAdminTranslations("common");
  const params = await searchParams;

  const domain = oneOf(param(params, "action"), DOMAINS);
  const outcome = oneOf(param(params, "outcome"), AUDIT_OUTCOMES);
  const visibility = superAdmin ? oneOf(param(params, "visibility"), AUDIT_VISIBILITIES) : "all";
  const target = param(params, "target");
  const actor = param(params, "actor");
  const page = pageOf(param(params, "page"));
  const current = {
    action: domain === "all" ? undefined : domain,
    outcome: outcome === "all" ? undefined : outcome,
    visibility: visibility === "all" ? undefined : visibility,
    target: target && UUID.test(target) ? target : undefined,
    actor: actor && UUID.test(actor) ? actor : undefined,
    page: page > 1 ? String(page) : undefined,
  };
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

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />

      <div className="flex flex-wrap items-center gap-2">
        <LinkPills
          label={t("filters.action")}
          items={DOMAINS.map((each) => ({
            key: each,
            label: t(`filters.domains.${each === "all" ? each : (each.slice(0, -1) as "users" | "roles" | "audit")}`),
            href: href({ action: each === "all" ? null : each, page: null }),
            active: each === domain,
          }))}
        />
        <LinkPills
          label={t("filters.outcome")}
          items={AUDIT_OUTCOMES.map((each) => ({
            key: each,
            label: t(`filters.outcomes.${each}`),
            href: href({ outcome: each === "all" ? null : each, page: null }),
            active: each === outcome,
          }))}
        />
        {superAdmin && (
          <LinkPills
            label={t("filters.visibility")}
            items={AUDIT_VISIBILITIES.map((each) => ({
              key: each,
              label: t(`filters.visibilities.${each}`),
              href: href({ visibility: each === "all" ? null : each, page: null }),
              active: each === visibility,
            }))}
          />
        )}
        {current.target && (
          <FilterBadge label={t("filters.target", { name: nameOf(current.target) })} clear={t("filters.clear")} href={href({ target: null, page: null })} />
        )}
        {current.actor && (
          <FilterBadge label={t("filters.actor", { name: nameOf(current.actor) })} clear={t("filters.clear")} href={href({ actor: null, page: null })} />
        )}
      </div>

      {list.items.length === 0 ? (
        <p className="rounded-xl border border-dashed p-8 text-center text-sm text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.items.map((entry) => (
            <AuditEntryItem key={entry.id} entry={entry} masking={superAdmin} />
          ))}
        </ul>
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
    </>
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
