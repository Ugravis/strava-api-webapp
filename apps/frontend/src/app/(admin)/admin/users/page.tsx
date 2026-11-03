import type { AdminUsersOverview, AdminUserTag } from "@kilotrace/shared/admin";
import { BanIcon, UserCheckIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { StatTile } from "@/components/admin/statistics/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { UsersTable } from "./users-table";

const number = new Intl.NumberFormat("fr-FR");
const percent = (part: number, total: number) => (total > 0 ? `${Math.round((part / total) * 100)} %` : "—");

/** The figures of the accounts, then the accounts; one opens in the side panel. */
export default async function AdminUsersPage() {
  const me = await requireAdminMember();
  const t = getAdminTranslations("users");
  const o = getAdminTranslations("users.overview");
  const [overview, tags] = await Promise.all([adminApi<AdminUsersOverview>("/users/overview"), adminApi<AdminUserTag[]>("/user-tags")]);
  const figures = overview.ok ? overview.data : null;
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {figures && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <StatTile
            icon={UsersIcon}
            label={o("accounts")}
            value={number.format(figures.total)}
            detail={o("accountsDetail", { share: percent(figures.stravaConnected, figures.total) })}
          />
          <StatTile icon={UserPlusIcon} label={o("signups")} value={number.format(figures.signups)} detail={o("signupsDetail")} />
          <StatTile icon={UserCheckIcon} label={o("active")} value={number.format(figures.active)} detail={o("activeDetail", { share: percent(figures.active, figures.total) })} />
          <StatTile icon={BanIcon} label={o("suspended")} value={number.format(figures.suspended)} detail={o("suspendedDetail", { share: percent(figures.suspended, figures.total) })} />
        </div>
      )}
      <UsersTable me={me} auditLogPath={adminRoutes.auditLog} tags={tags.ok ? tags.data : []} />
    </>
  );
}
