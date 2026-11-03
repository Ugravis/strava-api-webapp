import type { AdminSiteActivityOverview } from "@kilotrace/shared/admin";
import { ActivityIcon, ClockIcon, EyeIcon, LayersIcon, MousePointerClickIcon, PercentIcon, TimerIcon, UserPlusIcon, UsersIcon, WavesIcon } from "lucide-react";
import { StatTile } from "@/components/admin/statistics/stat-tile";
import { getAdminTranslations } from "@/lib/admin/messages";
import type { SiteActivityFormat } from "./site-activity-format";

/** Figures of the period, each with the one of the period before. */
export function OverviewTiles({ data, format }: { data: AdminSiteActivityOverview; format: SiteActivityFormat }) {
  const t = getAdminTranslations("siteActivity");
  const { current, previous } = data;
  const compared = (key: keyof typeof current, value: (figure: number) => string = format.number) => ({
    value: value(current[key]),
    detail: t("previous", { value: value(previous[key]) }),
  });
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
      <StatTile icon={UsersIcon} label={t("overview.users")} value={format.number(data.users)} />
      <StatTile icon={ActivityIcon} label={t("overview.activeUsers")} {...compared("activeUsers")} />
      <StatTile icon={UserPlusIcon} label={t("overview.newUsers")} {...compared("newUsers")} />
      <StatTile icon={EyeIcon} label={t("overview.views")} {...compared("views")} />
      <StatTile icon={LayersIcon} label={t("overview.sessions")} {...compared("sessions")} />
      <StatTile icon={ClockIcon} label={t("overview.visibleMs")} {...compared("visibleMs", format.duration)} />
      <StatTile icon={WavesIcon} label={t("overview.stickiness")} value={format.percent(data.stickiness)} />
      <StatTile icon={TimerIcon} label={t("overview.averageSession")} value={format.duration(data.averageSessionMs)} />
      <StatTile icon={MousePointerClickIcon} label={t("overview.pagesPerSession")} value={data.pagesPerSession === null ? "—" : format.number(data.pagesPerSession, 1)} />
      <StatTile icon={PercentIcon} label={t("overview.bounceRate")} value={format.percent(data.bounceRate)} />
    </div>
  );
}
