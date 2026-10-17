"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { useTileVisits } from "@/hooks/use-tile-visits";
import { TILE_ZOOM } from "@/lib/tiles/tile-geometry";
import type { TileRef } from "./tile-highlight";
import { TileActivityList } from "./tile-activity-list";

const SUBTILES_PER_TILE = 64;

interface TileDialogProps {
  /** Null when closed. */
  tile: TileRef | null;
  onClose: () => void;
}

/** Details of a visited tile, centered over the map: its achievements, figures and activities. */
export function TileDialog({ tile, onClose }: TileDialogProps) {
  const t = useTranslations("map.tileDialog");
  // The last tile stays rendered while the dialog fades out.
  const [shown, setShown] = useState(tile);
  if (tile && tile !== shown) setShown(tile);

  return (
    <Dialog open={tile !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        closeLabel={t("close")}
        className="flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col gap-0 p-0 sm:max-w-md"
      >
        {shown && <TileDetails key={`${shown.zoom}/${shown.x}/${shown.y}`} tile={shown} />}
      </DialogContent>
    </Dialog>
  );
}

function TileDetails({ tile: { zoom, x, y } }: { tile: TileRef }) {
  const t = useTranslations("map.tileDialog");
  const format = useFormatter();
  const { visits, error } = useTileVisits(zoom, x, y);
  const details = visits?.tile;
  const date = (value: string) => format.dateTime(new Date(value), { dateStyle: "medium" });

  return (
    <>
      <DialogHeader className="gap-3 border-b p-4 pr-12">
        <DialogTitle>{zoom === TILE_ZOOM ? t("tile") : t("subtile")}</DialogTitle>
        <DialogDescription>{t("description")}</DialogDescription>
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
      </DialogHeader>

      <div className="flex flex-col gap-5 overflow-y-auto p-4">
        {error ? (
          <p className="text-muted-foreground">{t("error")}</p>
        ) : !visits ? (
          <div className="grid grid-cols-3 gap-3" aria-busy>
            {Array.from({ length: 3 }, (_, index) => (
              <div key={index} className="flex flex-col gap-1.5">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-5 w-20" />
              </div>
            ))}
          </div>
        ) : (
          <>
            <dl className="grid grid-cols-3 gap-3">
              <Figure label={t("visits")} value={format.number(visits.activities)} />
              {visits.firstVisitedAt && <Figure label={t("firstVisit")} value={date(visits.firstVisitedAt)} />}
              {visits.lastVisitedAt && <Figure label={t("lastVisit")} value={date(visits.lastVisitedAt)} />}
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
          <TileActivityList zoom={zoom} x={x} y={y} />
        </section>
      </div>
    </>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="font-medium tabular-nums">{value}</dd>
    </div>
  );
}
