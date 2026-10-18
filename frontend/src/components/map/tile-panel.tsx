"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTileVisits } from "@/hooks/use-tile-visits";
import { TILE_ZOOM } from "@/lib/tiles/tile-geometry";
import { PanelFigure, PanelFiguresSkeleton } from "./panel-figure";
import { TileActivityList } from "./tile-activity-list";
import type { TileRef } from "./tile-highlight";

const SUBTILES_PER_TILE = 64;

interface TilePanelProps {
  tile: TileRef;
  onOpenActivity: (activityId: string) => void;
}

/** Content of the panel for a visited tile: its achievements, figures and activities. */
export function TilePanel({ tile: { zoom, x, y }, onOpenActivity }: TilePanelProps) {
  const t = useTranslations("map.tilePanel");
  const format = useFormatter();
  const { visits, error } = useTileVisits(zoom, x, y);
  const details = visits?.tile;
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });

  return (
    <div className="flex flex-col gap-5">
      <header className="flex flex-col gap-2">
        <h2 className="font-heading text-base font-medium">{zoom === TILE_ZOOM ? t("tile") : t("subtile")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
        {details && (details.inMaxSquare || details.inMaxCluster || details.clustered) && (
          <div className="flex flex-wrap gap-1">
            {details.inMaxSquare && <Badge variant="outline">{t("inMaxSquare")}</Badge>}
            {details.inMaxCluster ? (
              <Badge variant="outline">{t("inMaxCluster")}</Badge>
            ) : (
              details.clustered && <Badge variant="outline">{t("clustered")}</Badge>
            )}
          </div>
        )}
      </header>

      {error ? (
        <p className="text-muted-foreground">{t("error")}</p>
      ) : details && !details.visited ? (
        <p className="text-muted-foreground">{t("notVisited")}</p>
      ) : !visits ? (
        <PanelFiguresSkeleton count={3} />
      ) : (
        <>
          <dl className="grid grid-cols-3 gap-3">
            <PanelFigure label={t("visits")} value={format.number(visits.activities)} />
            {visits.firstVisitedAt && <PanelFigure label={t("firstVisit")} value={date(visits.firstVisitedAt)} />}
            {visits.lastVisitedAt && <PanelFigure label={t("lastVisit")} value={date(visits.lastVisitedAt)} />}
          </dl>
          {details && details.subtiles !== null && (
            <div className="flex flex-col gap-1.5">
              <p className="flex justify-between text-muted-foreground">
                {t("subtiles")}
                <span className="font-medium text-foreground tabular-nums">
                  {details.subtiles} / {SUBTILES_PER_TILE}
                </span>
              </p>
              <Progress value={(details.subtiles / SUBTILES_PER_TILE) * 100} aria-label={t("subtiles")} />
            </div>
          )}
        </>
      )}

      <section className="flex flex-col gap-1">
        <h3 className="text-xs font-medium text-muted-foreground uppercase">{t("activities")}</h3>
        <TileActivityList zoom={zoom} x={x} y={y} onOpenActivity={onOpenActivity} />
      </section>
    </div>
  );
}
