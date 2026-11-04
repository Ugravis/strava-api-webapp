import { ArrowDownRightIcon, ArrowRightIcon, ArrowUpRightIcon, type LucideIcon } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { SERIES_COLORS, type SeriesColorName } from "@/components/admin/statistics/palette";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

const COLUMNS = { 3: "@xl:grid-cols-3", 4: "@2xl:grid-cols-4" } as const;

/** The row of headline figures of a page, following its own width: a side panel narrows it without resizing the window. */
export function KpiGrid({ columns = 4, children }: { columns?: keyof typeof COLUMNS; children: ReactNode }) {
  return (
    <div className="@container">
      <div className={cn("grid grid-cols-1 gap-3 @xs:grid-cols-2 @lg:gap-4", COLUMNS[columns])}>{children}</div>
    </div>
  );
}

export interface KpiSegment {
  label: string;
  value: number;
}

/** Daily additions as a running total, ending on the total of today. */
export function runningTotal(daily: number[], total: number) {
  let remaining = total - daily.reduce((sum, count) => sum + count, 0);
  return daily.map((count) => (remaining += count));
}

/** The part of a whole, 0 without a whole. */
export const shareOf = (part: number, whole: number) => (whole > 0 ? part / whole : 0);

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
  /** The page it sums up, opened on click. */
  href?: string;
  /** A share, from 0 to 1, drawn as a bar under the figure. */
  gauge?: number | null;
  /** The parts of the figure, drawn as a stacked bar; each one tells its label and value on hover. */
  segments?: KpiSegment[];
  /** In place of the drawings above, e.g. a gauge with a warning. */
  footer?: ReactNode;
}

/** A headline figure, with its trend and its last days when it has them. */
export function KpiTile({ icon: Icon, label, value, detail, trend, spark, sparkFromMin = false, color = "blue", href, gauge, segments, footer }: KpiTileProps) {
  const TrendIcon = trend && trend.ratio < 0 ? ArrowDownRightIcon : ArrowUpRightIcon;
  const bottom =
    footer ??
    (spark ? <Sparkline values={spark} color={color} fromMin={sparkFromMin} /> : segments ? <Segments segments={segments} /> : gauge != null ? <Gauge ratio={gauge} color={color} /> : null);
  const card = (
    <Card className={cn("h-full gap-2 px-4 py-4", href && "transition-shadow group-hover/kpi:ring-foreground/20 group-hover/kpi:shadow-sm")}>
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground @lg:text-sm">
        <span className="flex min-w-0 items-center gap-2">
          <span className={cn("flex size-7 shrink-0 items-center justify-center rounded-md bg-muted", SERIES_COLORS[color].text)}>
            <Icon className="size-4" aria-hidden />
          </span>
          <span className="truncate">{label}</span>
        </span>
        {href && <ArrowRightIcon className="size-3.5 shrink-0 opacity-0 transition-opacity group-hover/kpi:opacity-100" aria-hidden />}
      </div>
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
        <span className="text-2xl font-semibold tracking-tight tabular-nums @lg:text-3xl">{value}</span>
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
      {bottom && <div className="mt-auto pt-1">{bottom}</div>}
    </Card>
  );
  if (!href) return card;
  return (
    <Link href={href} className="group/kpi rounded-xl focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none">
      {card}
    </Link>
  );
}

/** Stands for a tile while its data loads. */
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

function Gauge({ ratio, color }: { ratio: number; color: SeriesColorName }) {
  return (
    <span className="block h-1.5 overflow-hidden rounded-full bg-muted" aria-hidden>
      <span className={cn("block h-full rounded-full", SERIES_COLORS[color].swatch)} style={{ width: `${Math.min(ratio, 1) * 100}%` }} />
    </span>
  );
}

const SEGMENT_COLORS: SeriesColorName[] = ["blue", "aqua", "orange", "yellow", "muted"];

function Segments({ segments }: { segments: KpiSegment[] }) {
  const total = segments.reduce((sum, { value }) => sum + value, 0);
  const parts = segments.flatMap((segment, index) => (segment.value > 0 ? [{ ...segment, color: SERIES_COLORS[SEGMENT_COLORS[index % SEGMENT_COLORS.length]].swatch }] : []));
  const text = ({ label, value }: KpiSegment) => `${label} : ${value.toLocaleString("fr-FR")} (${Math.round((value / total) * 100)} %)`;
  if (total === 0) return <span className="block h-1.5 rounded-full bg-muted" aria-hidden />;
  return (
    <>
      {/* Taller than the bar, so that a part is easy to hover; the margins keep it in line with the gauges. */}
      <div className="-my-[5px] flex h-4 gap-0.5" aria-hidden>
        {parts.map((part) => (
          <Tooltip key={part.label}>
            <TooltipTrigger
              render={<span />}
              className="group/segment flex min-w-1 items-center first:[&>span]:rounded-l-full last:[&>span]:rounded-r-full"
              style={{ flexGrow: part.value, flexBasis: 0 }}
            >
              <span className={cn("h-1.5 w-full transition-[height] group-hover/segment:h-2", part.color)} />
            </TooltipTrigger>
            <TooltipContent>{text(part)}</TooltipContent>
          </Tooltip>
        ))}
      </div>
      <ul className="sr-only">
        {parts.map((part) => (
          <li key={part.label}>{text(part)}</li>
        ))}
      </ul>
    </>
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
