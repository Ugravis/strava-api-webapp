import { type ReservedUsernamesOverview, RESERVED_USERNAME_CATEGORIES } from "@kilotrace/shared/admin";
import { AtSignIcon, CalendarPlusIcon, LayersIcon } from "lucide-react";
import { KpiGrid, KpiTile, shareOf } from "@/components/admin/kpi-tile";
import { PageHeader } from "@kilotrace/ui/components/layout/page-header";
import { Separator } from "@kilotrace/ui/components/ui/separator";
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
        <KpiGrid columns={3}>
          <KpiTile icon={AtSignIcon} color="blue" label={o("total")} value={number.format(figures.total)} detail={o("totalDetail", { count: number.format(figures.byCategory.system) })} segments={RESERVED_USERNAME_CATEGORIES.map((each) => ({ label: t(`categories.${each}`), value: figures.byCategory[each] }))} />
          <KpiTile icon={CalendarPlusIcon} color="aqua" label={o("recent")} value={number.format(figures.recent)} detail={o("recentDetail")} spark={figures.addedByDay} />
          <KpiTile
            icon={LayersIcon}
            color="orange"
            label={o("top")}
            value={top ? number.format(figures.byCategory[top]) : "—"}
            detail={top ? o("topDetail", { category: t(`categories.${top}`) }) : o("topEmpty")}
            gauge={top ? shareOf(figures.byCategory[top], figures.total) : 0}
          />
        </KpiGrid>
      )}
      <Separator />
      <ReservedTable canEdit={permissions.includes("usernames.manage")} />
    </>
  );
}
