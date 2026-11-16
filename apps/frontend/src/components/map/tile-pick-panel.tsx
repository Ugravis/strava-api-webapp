"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@kilotrace/ui/components/ui/tabs";
import { SUBTILE_ZOOM, TILE_ZOOM, type TileZoom } from "@/lib/tiles/tile-geometry";
import { shownTile, type TilePick } from "./panel-entry";
import { TilePanel } from "./tile-panel";

/** What a place picked on the map shows: its train station, or one level of its tiles. */
export type PlaceView = "station" | TileZoom;

interface PlaceTabsProps {
  /** Whether a train station stands at the place. */
  station: boolean;
  /** The tiles visited at the place, if any. */
  pick: TilePick | null | undefined;
  value: PlaceView;
  onValueChange: (view: PlaceView) => void;
}

/**
 * Tabs between the views of a place picked on the map: the pointer aims at
 * a train station, a large tile and a small tile at once. Hidden with a
 * single view.
 */
export function PlaceTabs({ station, pick, value, onValueChange }: PlaceTabsProps) {
  const t = useTranslations("map.tilePanel");
  if (!pick) return null;

  return (
    <Tabs
      value={String(value)}
      onValueChange={(view) => onValueChange(view === "station" ? "station" : (Number(view) as TileZoom))}
    >
      <TabsList className="w-full">
        {station && <TabsTrigger value="station">{t("station")}</TabsTrigger>}
        <TabsTrigger value={String(TILE_ZOOM)}>{t("tile")}</TabsTrigger>
        <TabsTrigger value={String(SUBTILE_ZOOM)} disabled={!pick.subtile}>
          {t("subtile")}
        </TabsTrigger>
      </TabsList>
    </Tabs>
  );
}

interface TilePickPanelProps {
  pick: TilePick;
  /** The train station at the place, if any: a tab shows it. */
  stationId?: number;
  /** Shows another view of the place picked. */
  onViewChange: (view: PlaceView) => void;
  onOpenActivity: (activityId: string) => void;
}

/** Content of the panel for a place picked on the map, at the level of its tiles shown. */
export function TilePickPanel({ pick, stationId, onViewChange, onOpenActivity }: TilePickPanelProps) {
  const tile = shownTile(pick);

  return (
    <div className="flex flex-col gap-5">
      <PlaceTabs station={stationId !== undefined} pick={pick} value={tile.zoom} onValueChange={onViewChange} />
      <TilePanel key={`${tile.zoom}/${tile.x}/${tile.y}`} tile={tile} onOpenActivity={onOpenActivity} />
    </div>
  );
}
