import type { AdminUsersOverview, AdminUserTag } from "@kilotrace/shared/admin";
import { BanIcon, FlagIcon, UserCheckIcon, UserPlusIcon, UsersIcon } from "lucide-react";
import { KpiGrid, KpiTile, runningTotal, shareOf } from "@/components/admin/kpi-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Separator } from "@/components/ui/separator";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { ReportsTable } from "./reports/reports-table";
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
        <KpiGrid>
          <KpiTile
            icon={UsersIcon}
            color="blue"
            label={o("accounts")}
            value={number.format(figures.total)}
            detail={o("accountsDetail", { share: percent(figures.stravaConnected, figures.total) })}
            spark={runningTotal(figures.signupsByDay, figures.total)}
            sparkFromMin
          />
          <KpiTile icon={UserPlusIcon} color="aqua" label={o("signups")} value={number.format(figures.signups)} detail={o("signupsDetail")} spark={figures.signupsByDay} />
          <KpiTile icon={UserCheckIcon} color="yellow" label={o("active")} value={number.format(figures.active)} detail={o("activeDetail", { share: percent(figures.active, figures.total) })} gauge={shareOf(figures.active, figures.total)} />
          <KpiTile icon={BanIcon} color="orange" label={o("suspended")} value={number.format(figures.suspended)} detail={o("suspendedDetail", { share: percent(figures.suspended, figures.total) })} gauge={shareOf(figures.suspended, figures.total)} />
        </KpiGrid>
      )}
      <Separator />
      <section id="reports" className="flex scroll-mt-20 flex-col gap-3" aria-labelledby="reports-title">
        <h2 id="reports-title" className="flex items-center gap-2 text-sm font-medium">
          <FlagIcon className="size-4 text-muted-foreground" aria-hidden />
          {t("reports")}
        </h2>
        <ReportsTable />
      </section>
      <Separator />
      <UsersTable me={me} auditLogPath={adminRoutes.auditLog} tags={tags.ok ? tags.data : []} />
    </>
  );
}
