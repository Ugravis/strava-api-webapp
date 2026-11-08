import type { AdminExplorationFigure } from "@kilotrace/shared/admin";
import { GridIcon, Grid3x3Icon, RouteIcon, TrainFrontIcon } from "lucide-react";
import { getFormatter } from "next-intl/server";
import { SERIES_COLORS } from "@/components/admin/statistics/palette";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminRoutes } from "@/lib/admin/navigation";
import { cn } from "@kilotrace/ui/lib/utils";
import { dashboardData } from "./data";
import { KpiGrid, KpiTile } from "@/components/admin/kpi-tile";
import { DashboardCard, DashboardUnavailable } from "./parts";

/** The totals of each day of the period, from the total today and what was gained each day after. */
function cumulative(total: number, daily: number[]): number[] {
  const values = new Array<number>(daily.length);
  let value = total;
  for (let index = daily.length - 1; index >= 0; index -= 1) {
    values[index] = value;
    value -= daily[index];
  }
  return values;
}

/** What the community explored, as the headline figures: totals, gains of the period, growth. */
export async function DashboardExploration() {
  const t = getAdminTranslations("dashboard.exploration");
  const [format, exploration] = await Promise.all([getFormatter(), dashboardData.exploration()]);
  const none = "–";
  const sum = (values: number[]) => values.reduce((total, value) => total + value, 0);
  const percent = (ratio: number, signed = false) =>
    format.number(ratio, { style: "percent", maximumFractionDigits: ratio !== 0 && Math.abs(ratio) < 0.01 ? 2 : 0, ...(signed && { signDisplay: "exceptZero" }) });
  /** Growth over the period: what was gained against what there was before it. */
  const trend = (figure: AdminExplorationFigure) => {
    const gained = sum(figure.daily);
    const before = figure.total - gained;
    return before > 0 && gained > 0 ? { ratio: gained / before, text: percent(gained / before, true) } : null;
  };
  const km = (meters: number) => t("km", { value: format.number(meters / 1000, { maximumFractionDigits: 0 }) });
  const days = exploration?.dates.length ?? 0;
  const href = adminRoutes.statistics;
  return (
    <KpiGrid>
      <KpiTile
        icon={GridIcon}
        label={t("tiles")}
        href={href}
        color="aqua"
        value={exploration ? format.number(exploration.tiles.total) : none}
        trend={exploration && trend(exploration.tiles)}
        detail={exploration && t("gained", { value: format.number(sum(exploration.tiles.daily)), days })}
        sparkFromMin
        spark={exploration && cumulative(exploration.tiles.total, exploration.tiles.daily)}
      />
      <KpiTile
        icon={Grid3x3Icon}
        label={t("smallTiles")}
        href={href}
        color="blue"
        value={exploration ? format.number(exploration.smallTiles.total) : none}
        trend={exploration && trend(exploration.smallTiles)}
        detail={exploration && t("gained", { value: format.number(sum(exploration.smallTiles.daily)), days })}
        sparkFromMin
        spark={exploration && cumulative(exploration.smallTiles.total, exploration.smallTiles.daily)}
      />
      <KpiTile
        icon={TrainFrontIcon}
        label={t("stations")}
        href={href}
        color="orange"
        value={exploration ? format.number(exploration.stations.total) : none}
        trend={exploration && trend(exploration.stations)}
        detail={
          exploration &&
          t("ofTotal", {
            share: percent(exploration.stations.imported > 0 ? exploration.stations.total / exploration.stations.imported : 0),
            total: format.number(exploration.stations.imported),
          })
        }
        sparkFromMin
        spark={exploration && cumulative(exploration.stations.total, exploration.stations.daily)}
      />
      <KpiTile
        icon={RouteIcon}
        label={t("railway")}
        href={href}
        color="yellow"
        value={exploration ? km(exploration.railwayM.total) : none}
        trend={exploration && trend(exploration.railwayM)}
        detail={
          exploration &&
          t("ofTotal", {
            share: percent(exploration.railwayM.imported > 0 ? exploration.railwayM.total / exploration.railwayM.imported : 0),
            total: km(exploration.railwayM.imported),
          })
        }
        sparkFromMin
        spark={exploration && cumulative(exploration.railwayM.total, exploration.railwayM.daily)}
      />
    </KpiGrid>
  );
}

const RING_RADIUS = 34;
const RING_LENGTH = 2 * Math.PI * RING_RADIUS;

/** The release note shown now: who it concerns and how many read it. */
export async function DashboardReleaseNote() {
  const t = getAdminTranslations("dashboard.releaseNote");
  const [format, overview] = await Promise.all([getFormatter(), dashboardData.releaseNotes()]);
  const latest = overview?.latest;
  const read = latest && latest.concerned > 0 ? latest.seen / latest.concerned : 0;
  return (
    <DashboardCard title={t("title")} description={overview && t("description", { version: overview.currentVersion })} href={adminRoutes.releaseNotes}>
      {!overview ? (
        <DashboardUnavailable />
      ) : !latest ? (
        <p className="text-sm text-muted-foreground">{t("none")}</p>
      ) : (
        <div className="flex h-full flex-col justify-between gap-4">
          <div className="flex flex-1 items-center gap-4">
            <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" role="img" aria-label={t("readShare", { share: format.number(read, { style: "percent" }) })}>
              <circle cx="40" cy="40" r={RING_RADIUS} fill="none" strokeWidth="8" className="stroke-muted" />
              <circle
                cx="40"
                cy="40"
                r={RING_RADIUS}
                fill="none"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={RING_LENGTH}
                strokeDashoffset={RING_LENGTH * (1 - read)}
                className={SERIES_COLORS.aqua.stroke}
              />
              <text x="40" y="40" dy="0.35em" textAnchor="middle" transform="rotate(90 40 40)" className="fill-foreground text-[15px] font-semibold tabular-nums">
                {format.number(read, { style: "percent", maximumFractionDigits: 0 })}
              </text>
            </svg>
            <div className="flex flex-col gap-0.5">
              <span className="text-lg font-semibold tracking-tight">{t("version", { version: latest.version })}</span>
              <span className="text-sm text-muted-foreground">{t("seen", { seen: latest.seen, concerned: latest.concerned })}</span>
            </div>
          </div>
          <dl className="grid grid-cols-3 gap-2 text-center">
            {(["published", "upcoming", "missing"] as const).map((key) => (
              <div key={key} className="flex flex-col-reverse rounded-lg bg-muted/50 px-2 py-2">
                <dt className="text-[11px] text-muted-foreground">{t(key)}</dt>
                <dd className={cn("text-base font-semibold tabular-nums", key === "missing" && overview.missing > 0 && "text-amber-600 dark:text-amber-400")}>{format.number(overview[key])}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </DashboardCard>
  );
}
