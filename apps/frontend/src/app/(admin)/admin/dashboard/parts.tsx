import { ArrowRightIcon, ArrowDownRightIcon, ArrowUpRightIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SERIES_COLORS, type SeriesColorName } from "@/components/admin/statistics/palette";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";

interface DashboardCardProps {
  title: string;
  description?: ReactNode;
  /** The page the card sums up, linked from its header. */
  href?: string;
  className?: string;
  children: ReactNode;
}

/** A block of the dashboard: a title, a link to its page, then its content. */
export function DashboardCard({ title, description, href, className, children }: DashboardCardProps) {
  const t = getAdminTranslations("dashboard");
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {href && (
          <CardAction>
            <Link href={href} className="inline-flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground">
              {t("seeAll")}
              <ArrowRightIcon className="size-3.5" aria-hidden />
            </Link>
          </CardAction>
        )}
      </CardHeader>
      <CardContent className="flex-1">{children}</CardContent>
    </Card>
  );
}

/** Stands for a card while its data loads. */
/** `chart` stands for a single tall block, as a chart. */
export function DashboardCardSkeleton({ rows = 4, chart = false, className }: { rows?: number; chart?: boolean; className?: string }) {
  return (
    <Card className={className}>
      <CardHeader>
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {chart ? <Skeleton className="h-56 w-full" /> : Array.from({ length: rows }, (_, index) => <Skeleton key={index} className="h-9 w-full" />)}
      </CardContent>
    </Card>
  );
}

/** Shown in place of a card whose call failed. */
export function DashboardUnavailable() {
  return <p className="text-sm text-muted-foreground">{getAdminTranslations("dashboard")("error")}</p>;
}

interface KpiTileProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  /** Change against the period before, as a ratio. */
  trend?: { ratio: number; text: string } | null;
  /** Daily values, oldest first, drawn under the figure. */
  spark?: number[] | null;
  /** Scales the sparkline from its lowest value, for a running total. */
  sparkFromMin?: boolean;
  color?: SeriesColorName;
  href: string;
  /** In place of the sparkline, e.g. a gauge. */
  footer?: ReactNode;
}

/** A headline figure, its trend and its last days; opens its page. */
export function KpiTile({ icon: Icon, label, value, detail, trend, spark, sparkFromMin = false, color = "blue", href, footer }: KpiTileProps) {
  const TrendIcon = trend && trend.ratio < 0 ? ArrowDownRightIcon : ArrowUpRightIcon;
  return (
    <Link href={href} className="group/kpi rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      <Card className="h-full gap-2 px-4 py-4 transition-shadow group-hover/kpi:ring-foreground/20 group-hover/kpi:shadow-sm">
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground sm:text-sm">
          <span className="flex min-w-0 items-center gap-2">
            <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md bg-muted", SERIES_COLORS[color].text)}>
              <Icon className="size-4" aria-hidden />
            </span>
            <span className="truncate">{label}</span>
          </span>
          <ArrowRightIcon className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/kpi:opacity-100" aria-hidden />
        </div>
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="text-2xl font-semibold tracking-tight tabular-nums sm:text-3xl">{value}</span>
          {trend && (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-xs font-medium tabular-nums",
                trend.ratio < 0 ? "bg-destructive/10 text-destructive" : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
              )}
            >
              <TrendIcon className="size-3" aria-hidden />
              {trend.text}
            </span>
          )}
        </div>
        {detail && <div className="text-xs text-muted-foreground">{detail}</div>}
        <div className="mt-auto pt-1">{footer ?? (spark && <Sparkline values={spark} color={color} fromMin={sparkFromMin} />)}</div>
      </Card>
    </Link>
  );
}

export function KpiTileSkeleton() {
  return (
    <Card className="gap-3 px-4 py-4">
      <Skeleton className="h-7 w-28" />
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-32" />
      <Skeleton className="h-8 w-full" />
    </Card>
  );
}

const SPARK_WIDTH = 120;
const SPARK_HEIGHT = 32;

/** A small area of daily values, drawn on the server, without axes; from zero, or from the lowest value. */
function Sparkline({ values, color, fromMin }: { values: number[]; color: SeriesColorName; fromMin: boolean }) {
  if (values.length < 2) return null;
  const min = fromMin ? Math.min(...values) : 0;
  const range = Math.max(...values) - min || 1;
  const step = SPARK_WIDTH / (values.length - 1);
  const points = values.map((value, index) => `${(index * step).toFixed(1)},${(SPARK_HEIGHT - 2 - ((value - min) / range) * (SPARK_HEIGHT - 4)).toFixed(1)}`);
  const gradient = `spark-${color}`;
  return (
    <svg viewBox={`0 0 ${SPARK_WIDTH} ${SPARK_HEIGHT}`} preserveAspectRatio="none" className={cn("h-8 w-full", SERIES_COLORS[color].text)} aria-hidden>
      <defs>
        <linearGradient id={gradient} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity={0.25} />
          <stop offset="100%" stopColor="currentColor" stopOpacity={0} />
        </linearGradient>
      </defs>
      <polygon points={`0,${SPARK_HEIGHT} ${points.join(" ")} ${SPARK_WIDTH},${SPARK_HEIGHT}`} fill={`url(#${gradient})`} />
      <polyline points={points.join(" ")} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
