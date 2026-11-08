import { ADMIN_DURATION_BUCKETS } from "@kilotrace/shared/admin";
import { ArrowRightIcon } from "lucide-react";
import { BarChart } from "@/components/admin/site-activity/bar-chart";
import { BarList, CardFigure, ChartHead, THIN_SCROLL } from "@/components/admin/site-activity/parts";
import { getSiteActivityFormat } from "@/components/admin/site-activity/site-activity-format";
import { TimeSeriesChart } from "@/components/admin/statistics/time-series-chart";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@kilotrace/ui/lib/utils";
import { DashboardCard, DashboardUnavailable } from "../dashboard/parts";
import { siteActivity, type SiteActivityView } from "./data";

const HEIGHT = 220;

/** How users browse: sessions, their length and depth, where they start, end and go. */
export async function SessionsTab({ view }: { view: SiteActivityView }) {
  const t = getAdminTranslations("siteActivity.sessions");
  const share = getAdminTranslations("siteActivity")("share");
  const [format, data] = await Promise.all([getSiteActivityFormat(), siteActivity("sessions", view.days, view.team, view.admin)]);
  if (!data) return <DashboardUnavailable />;

  const total = data.daily.reduce((sum, day) => sum + day.sessions, 0);
  const users = data.perUser.reduce((sum, bin) => sum + bin.count, 0);
  const sessionsOf = (count: number) => `${format.number(count)} · ${format.percent(format.ratio(count, total), 0)}`;
  const maxFlow = Math.max(...data.transitions.map((flow) => flow.count), 1);

  return (
    <>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <DashboardCard title={t("daily.title")} description={t("daily.description", { minutes: data.gapMinutes })} className="lg:col-span-2">
          <div className="flex flex-col gap-4">
            <ChartHead
              figures={
                <>
                  <CardFigure value={format.number(total)} label={t("daily.sessions")} />
                  <CardFigure value={format.number(total / Math.max(data.dates.length, 1), 1)} label={t("daily.perDay")} />
                  <CardFigure value={users > 0 ? format.number(total / users, 1) : "–"} label={t("daily.perUser")} />
                </>
              }
            />
            <TimeSeriesChart
              unit="day"
              height={HEIGHT}
              label={t("daily.title")}
              series={[{ id: "sessions", label: t("daily.sessions"), color: "orange" }]}
              points={data.daily.map((day) => ({ start: day.date, values: { sessions: day.sessions } }))}
              notes={[{ label: t("daily.users"), values: data.daily.map((day) => day.users) }]}
            />
          </div>
        </DashboardCard>
        <DashboardCard title={t("lengths.title")} description={t("lengths.description")}>
          <BarChart
            labels={[...ADMIN_DURATION_BUCKETS]}
            series={[{ id: "sessions", label: t("daily.sessions"), color: "orange" }]}
            values={{ sessions: ADMIN_DURATION_BUCKETS.map((bucket) => data.lengths.find((entry) => entry.bucket === bucket)?.sessions ?? 0) }}
            shareLabel={share}
            label={t("lengths.title")}
            height={HEIGHT + 60}
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard title={t("depth.title")} description={t("depth.description")}>
          <BarChart
            labels={data.pages.map((bin) => format.number(bin.value))}
            titles={data.pages.map((bin) => t("depth.bin", { count: bin.value }))}
            series={[{ id: "sessions", label: t("daily.sessions"), color: "blue" }]}
            values={{ sessions: data.pages.map((bin) => bin.count) }}
            shareLabel={share}
            label={t("depth.title")}
          />
        </DashboardCard>
        <DashboardCard title={t("perUser.title")} description={t("perUser.description", { days: view.days })}>
          <BarChart
            labels={data.perUser.map((bin) => format.number(bin.value))}
            titles={data.perUser.map((bin) => t("perUser.bin", { count: bin.value }))}
            series={[{ id: "users", label: t("perUser.users"), color: "aqua" }]}
            values={{ users: data.perUser.map((bin) => bin.count) }}
            shareLabel={share}
            label={t("perUser.title")}
          />
        </DashboardCard>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DashboardCard title={t("entries.title")} description={t("entries.description")}>
          <BarList
            mono
            empty={t("empty")}
            maxHeight={360}
            items={data.entries.map((entry) => ({ key: entry.path, label: entry.path, value: entry.sessions, figure: sessionsOf(entry.sessions) }))}
          />
        </DashboardCard>
        <DashboardCard title={t("exits.title")} description={t("exits.description")}>
          <BarList
            mono
            color="orange"
            empty={t("empty")}
            maxHeight={360}
            items={data.exits.map((exit) => ({ key: exit.path, label: exit.path, value: exit.sessions, figure: sessionsOf(exit.sessions) }))}
          />
        </DashboardCard>
      </div>

      <DashboardCard title={t("transitions.title")} description={t("transitions.description")}>
        {data.transitions.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t("empty")}</p>
        ) : (
          <ol className={cn("-mx-2 grid max-h-120 grid-cols-1 gap-x-4 gap-y-1 px-2 md:grid-cols-2", THIN_SCROLL)}>
            {data.transitions.map((flow) => (
              <li
                key={`${flow.from}>${flow.to}`}
                title={`${flow.from} → ${flow.to}`}
                className="relative flex h-7 items-center gap-2 overflow-hidden rounded-md px-2 font-mono text-xs"
              >
                <span className="absolute inset-y-0 left-0 rounded-md bg-[#2a78d6]/10 dark:bg-[#3987e5]/15" style={{ width: `${(flow.count / maxFlow) * 100}%` }} aria-hidden />
                <span className="relative min-w-0 truncate text-muted-foreground">{flow.from}</span>
                <ArrowRightIcon className="relative size-3 shrink-0 text-muted-foreground" aria-label={t("transitions.then")} />
                <span className="relative min-w-0 flex-1 truncate">{flow.to}</span>
                <span className="relative shrink-0 font-sans font-medium tabular-nums">{format.number(flow.count)}</span>
              </li>
            ))}
          </ol>
        )}
      </DashboardCard>
    </>
  );
}
