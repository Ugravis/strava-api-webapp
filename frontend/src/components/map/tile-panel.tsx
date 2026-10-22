"use client";

import { useFormatter, useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useTileVisits } from "@/hooks/use-tile-visits";
import { TILE_ZOOM } from "@/lib/tiles/tile-geometry";
import { PanelFigure, PanelFigures, PanelFiguresSkeleton, PanelSection } from "./panel-figure";
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
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-2.5">
        {/* Named by the tabs above. */}
        <h2 className="sr-only">{zoom === TILE_ZOOM ? t("tile") : t("subtile")}</h2>
        <p className="text-muted-foreground">{t("description")}</p>
        {details && (details.inMaxSquare || details.inMaxCluster || details.clustered) && (
          <div className="flex flex-wrap gap-1.5">
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
        <div className="flex flex-col gap-2">
          <PanelFigures>
            <PanelFigure label={t("visits")} value={format.number(visits.activities)} />
            {visits.firstVisitedAt && <PanelFigure label={t("firstVisit")} value={date(visits.firstVisitedAt)} />}
            {visits.lastVisitedAt && <PanelFigure label={t("lastVisit")} value={date(visits.lastVisitedAt)} />}
          </PanelFigures>
          {details && details.subtiles !== null && (
            <div className="flex flex-col gap-2 rounded-lg bg-muted/60 px-3 py-2.5">
              <p className="flex items-baseline justify-between text-xs text-muted-foreground">
                {t("subtiles")}
                <span className="text-sm font-semibold text-foreground tabular-nums">
                  {details.subtiles}
                  <span className="text-xs font-normal text-muted-foreground"> / {SUBTILES_PER_TILE}</span>
                </span>
              </p>
              <Progress value={(details.subtiles / SUBTILES_PER_TILE) * 100} aria-label={t("subtiles")} />
            </div>
          )}
        </div>
      )}

      <PanelSection title={t("activities")}>
        <TileActivityList zoom={zoom} x={x} y={y} onOpenActivity={onOpenActivity} />
      </PanelSection>
    </div>
  );
}
