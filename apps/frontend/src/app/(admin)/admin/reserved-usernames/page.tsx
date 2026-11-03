import { type ReservedUsernamesOverview, RESERVED_USERNAME_CATEGORIES } from "@kilotrace/shared/admin";
import { AtSignIcon, CalendarPlusIcon, LayersIcon } from "lucide-react";
import { StatTile } from "@/components/admin/statistics/stat-tile";
import { PageHeader } from "@/components/layout/page-header";
import { Separator } from "@/components/ui/separator";
import { requireAdminMember } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { ReservedTable } from "./reserved-table";

const number = new Intl.NumberFormat("fr-FR");

/** The figures of the reserved usernames, then the usernames nobody can take: every member reads, the permission adds, edits and deletes. */
export default async function AdminReservedUsernamesPage() {
  const { permissions } = await requireAdminMember();
  const t = getAdminTranslations("reservedUsernames");
  const o = getAdminTranslations("reservedUsernames.overview");
  const overview = await adminApi<ReservedUsernamesOverview>("/reserved-usernames/overview");
  const figures = overview.ok ? overview.data : null;
  const top = figures && figures.total > 0 ? RESERVED_USERNAME_CATEGORIES.reduce((best, each) => (figures.byCategory[each] > figures.byCategory[best] ? each : best)) : null;
  return (
    <>
      <PageHeader title={t("title")} description={t("description")} />
      {figures && (
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
          <StatTile icon={AtSignIcon} label={o("total")} value={number.format(figures.total)} detail={o("totalDetail", { count: number.format(figures.byCategory.system) })} />
          <StatTile icon={CalendarPlusIcon} label={o("recent")} value={number.format(figures.recent)} detail={o("recentDetail")} />
          <StatTile
            icon={LayersIcon}
            label={o("top")}
            value={top ? number.format(figures.byCategory[top]) : "—"}
            detail={top ? o("topDetail", { category: t(`categories.${top}`) }) : o("topEmpty")}
          />
        </div>
      )}
      <Separator />
      <ReservedTable canEdit={permissions.includes("usernames.manage")} />
    </>
  );
}
