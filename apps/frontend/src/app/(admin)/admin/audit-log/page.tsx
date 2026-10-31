import type { AdminPage, AuditLogEntry } from "@kilotrace/shared/admin";
import { XIcon } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { hrefWith, param } from "@/lib/admin/url";
import type { AuditScope } from "./actions";
import { AuditTable } from "./audit-table";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * The logs, append-only: the super-admins may only mask an entry from the
 * other roles. `?target=` or `?actor=` keeps the entries of one user, e.g.
 * from their panel.
 */
export default async function AdminAuditLogPage({ searchParams }: PageProps<"/admin/audit-log">) {
  const { permissions } = await requireAdminMember();
  const t = getAdminTranslations("auditLog");
  const params = await searchParams;
  const target = param(params, "target");
  const actor = param(params, "actor");
  const scope: AuditScope = {
    target: target && UUID.test(target) ? target : undefined,
    actor: actor && UUID.test(actor) ? actor : undefined,
  };
  const names = await namesOf(scope);
  const href = (key: keyof AuditScope) =>
    hrefWith(adminRoutes.auditLog, Object.fromEntries(Object.keys(params).map((each) => [each, param(params, each)])), { [key]: null });

  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {(scope.target || scope.actor) && (
        <div className="flex flex-wrap gap-2">
          {scope.target && <FilterBadge label={t("filters.target", { name: names(scope.target) })} clear={t("filters.clear")} href={href("target")} />}
          {scope.actor && <FilterBadge label={t("filters.actor", { name: names(scope.actor) })} clear={t("filters.clear")} href={href("actor")} />}
        </div>
      )}
      <AuditTable scope={scope} superAdmin={permissions.includes("audit.hide")} usersPath={adminRoutes.users} />
    </>
  );
}

/** Names of the users of the scope, read from their own entries. */
async function namesOf(scope: AuditScope): Promise<(id: string) => string> {
  const query = new URLSearchParams(Object.entries(scope).filter((entry): entry is [string, string] => Boolean(entry[1])));
  const result = query.size > 0 ? await adminApi<AdminPage<AuditLogEntry>>(`/audit-log?${query}`) : null;
  const users = result?.ok ? result.data.items.flatMap((entry) => [entry.actor, entry.targetUser]) : [];
  return (id) => {
    const user = users.find((each) => each?.id === id);
    return user?.displayName ?? (user?.username ? `@${user.username}` : id.slice(0, 8));
  };
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
