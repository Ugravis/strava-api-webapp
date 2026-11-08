import type { AdminSiteActivityFunnelSteps } from "@kilotrace/shared/admin";
import { CircleUserRoundIcon, LinkIcon, type LucideIcon, MapIcon, RefreshCwIcon } from "lucide-react";
import { RateCell, THIN_SCROLL } from "@/components/admin/site-activity/parts";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { siteActivity, type SiteActivityView } from "./data";

const STEPS = ["signedUp", "stravaConnected", "firstSync", "mapVisited"] as const satisfies (keyof AdminSiteActivityFunnelSteps)[];

const ICONS: Record<(typeof STEPS)[number], LucideIcon> = {
  signedUp: CircleUserRoundIcon,
  stravaConnected: LinkIcon,
  firstSync: RefreshCwIcon,
  mapVisited: MapIcon,
};

/** From the sign-up to the map: every account, then week after week. */
export async function FunnelTab({ view }: { view: SiteActivityView }) {
  const t = getAdminTranslations("siteActivity.funnel");
  const [format, data] = await Promise.all([getSiteActivityFormat(), siteActivity("funnel", view.days, view.team, view.admin)]);
  if (!data) return <DashboardUnavailable />;
  const { steps } = data;
  const days = (value: number | null) => (value === null ? "–" : t("days", { value: format.number(value, 1) }));

  return (
    <>
      <DashboardCard title={t("steps.title")} description={t("steps.description")}>
        <ol className="grid grid-cols-1 gap-3 md:grid-cols-4">
          {STEPS.map((step, index) => {
            const Icon = ICONS[step];
            const overall = format.ratio(steps[step], steps.signedUp);
            const fromPrevious = index === 0 ? null : format.ratio(steps[step], steps[STEPS[index - 1]]);
            const median = step === "signedUp" ? null : data.medianDays[step];
            return (
              <li key={step} className="relative flex flex-col gap-3 rounded-xl bg-muted/40 p-4 ring-1 ring-foreground/5">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span className="flex size-7 items-center justify-center rounded-md bg-background text-[#2a78d6] ring-1 ring-foreground/10 dark:text-[#3987e5]">
                    <Icon className="size-4" aria-hidden />
                  </span>
                  <span className="text-xs font-medium tabular-nums">{index + 1}.</span>
                  {t(`steps.names.${step}`)}
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-semibold tracking-tight tabular-nums">{format.number(steps[step])}</span>
                  <span className="text-sm text-muted-foreground tabular-nums">{format.percent(overall, 0)}</span>
                </div>
                {/* The height of the bar is the share of the accounts that got there. */}
                <div className="flex h-20 items-end rounded-md bg-background/60 p-1 ring-1 ring-foreground/5" aria-hidden>
                  <span className="block w-full rounded-[4px] bg-[#2a78d6] dark:bg-[#3987e5]" style={{ height: `${Math.max((overall ?? 0) * 100, 2)}%` }} />
                </div>
                <div className="flex flex-col gap-0.5 text-xs text-muted-foreground">
                  <span>{fromPrevious === null ? t("steps.base") : t("steps.fromPrevious", { rate: format.percent(fromPrevious, 0) })}</span>
                  <span>{median === null ? t("steps.noDelay") : t("steps.median", { days: days(median) })}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </DashboardCard>

      <DashboardCard title={t("cohorts.title")} description={t("cohorts.description")}>
        {data.cohorts.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <div className={cn("-mx-2 max-h-120 overflow-x-auto px-2", THIN_SCROLL)}>
            <table className="border-separate border-spacing-0 text-sm">
              <thead className="sticky top-0 z-10 bg-card text-xs text-muted-foreground">
                <tr>
                  <th className="py-2 pr-3 text-left font-medium">{t("cohorts.week")}</th>
                  {STEPS.map((step) => (
                    <th key={step} className={cn("px-0.5 py-2 font-medium whitespace-nowrap", step === "signedUp" ? "pr-3 text-right" : "text-center")}>
                      {t(`steps.names.${step}`)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...data.cohorts].reverse().map((cohort) => (
                  <tr key={cohort.week}>
                    <td className="py-0.5 pr-3 text-xs whitespace-nowrap">{format.day(cohort.week)}</td>
                    <td className="py-0.5 pr-3 text-right text-xs font-medium tabular-nums">{format.number(cohort.signedUp)}</td>
                    {STEPS.slice(1).map((step) => {
                      const ratio = format.ratio(cohort[step], cohort.signedUp);
                      return (
                        <RateCell key={step} compact ratio={ratio} title={t("cohorts.cell", { count: cohort[step], total: cohort.signedUp })}>
                          {ratio === null ? "–" : format.percent(ratio, 0)}
                        </RateCell>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </>
  );
}
