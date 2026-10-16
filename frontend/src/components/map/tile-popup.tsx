"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useTileVisits } from "@/hooks/use-tile-visits";
import { TILE_ZOOM, type TileSummary, type TileZoom } from "@/lib/tiles/tile-geometry";

const SUBTILES_PER_TILE = 64;

interface TilePopupProps {
  zoom: TileZoom;
  x: number;
  y: number;
  summary: TileSummary;
}

/** Details of a visited tile: its achievements and the activities that crossed it. */
export function TilePopup({ zoom, x, y, summary }: TilePopupProps) {
  const t = useTranslations("map.tilePopup");
  const format = useFormatter();
  const { visits, error } = useTileVisits(zoom, x, y);
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });

  return (
    <div className="flex w-64 max-w-[calc(100vw-4rem)] flex-col gap-3 text-sm">
      <div className="flex flex-col gap-1.5 pr-5">
        <p className="font-medium">{zoom === TILE_ZOOM ? t("tile") : t("subtile")}</p>
        {(summary.inMaxSquare || summary.inMaxCluster || summary.clustered) && (
          <div className="flex flex-wrap gap-1">
            {summary.inMaxSquare && <Badge variant="outline">{t("inMaxSquare")}</Badge>}
            {summary.inMaxCluster ? (
              <Badge variant="outline">{t("inMaxCluster")}</Badge>
            ) : (
              summary.clustered && <Badge variant="outline">{t("clustered")}</Badge>
            )}
          </div>
        )}
      </div>

      {summary.subtiles !== null && (
        <div className="flex flex-col gap-1.5">
          <p className="flex justify-between text-muted-foreground">
            {t("subtiles")}
            <span className="font-medium text-foreground tabular-nums">
              {summary.subtiles} / {SUBTILES_PER_TILE}
            </span>
          </p>
          <Progress value={(summary.subtiles / SUBTILES_PER_TILE) * 100} aria-label={t("subtiles")} />
        </div>
      )}

      {error ? (
        <p className="text-muted-foreground">{t("error")}</p>
      ) : !visits ? (
        <div className="flex flex-col gap-2" aria-busy>
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-4 w-40" />
          <Skeleton className="h-4 w-36" />
        </div>
      ) : (
        <>
          <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
            <dt className="text-muted-foreground">{t("visits")}</dt>
            <dd className="text-right font-medium tabular-nums">{format.number(visits.activities)}</dd>
            {visits.firstVisitedAt && (
              <>
                <dt className="text-muted-foreground">{t("firstVisit")}</dt>
                <dd className="text-right">{date(visits.firstVisitedAt)}</dd>
              </>
            )}
            {visits.lastVisitedAt && visits.activities > 1 && (
              <>
                <dt className="text-muted-foreground">{t("lastVisit")}</dt>
                <dd className="text-right">{date(visits.lastVisitedAt)}</dd>
              </>
            )}
          </dl>
          {visits.recent.length > 0 && (
            <div className="flex flex-col gap-1">
              <p className="text-xs font-medium text-muted-foreground uppercase">{t("recent")}</p>
              <ul className="flex flex-col gap-1">
                {visits.recent.map((activity) => (
                  <li key={activity.id} className="flex items-baseline justify-between gap-2">
                    <span className="truncate">{activity.name}</span>
                    <span className="shrink-0 text-xs text-muted-foreground">{date(activity.startedAt)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
