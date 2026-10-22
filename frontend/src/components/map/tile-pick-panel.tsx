"use client";

import { useTranslations } from "next-intl";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SUBTILE_ZOOM, TILE_ZOOM, type TileZoom } from "@/lib/tiles/tile-geometry";
import { shownTile, type TilePick } from "./panel-entry";
import { TilePanel } from "./tile-panel";

interface TilePickPanelProps {
  pick: TilePick;
  /** Shows the other level of the place picked. */
  onZoomChange: (zoom: TileZoom) => void;
  onOpenActivity: (activityId: string) => void;
}

/**
 * Content of the panel for a place picked on the map: the pointer aims at a
 * large tile and a small tile at once, a tab shows either.
 */
export function TilePickPanel({ pick, onZoomChange, onOpenActivity }: TilePickPanelProps) {
  const t = useTranslations("map.tilePanel");
  const tile = shownTile(pick);

  return (
    <div className="flex flex-col gap-5">
      <Tabs value={tile.zoom} onValueChange={(zoom: TileZoom) => onZoomChange(zoom)}>
        <TabsList className="w-full">
          <TabsTrigger value={TILE_ZOOM}>{t("tile")}</TabsTrigger>
          <TabsTrigger value={SUBTILE_ZOOM} disabled={!pick.subtile}>
            {t("subtile")}
          </TabsTrigger>
        </TabsList>
      </Tabs>
      <TilePanel key={`${tile.zoom}/${tile.x}/${tile.y}`} tile={tile} onOpenActivity={onOpenActivity} />
    </div>
  );
}
