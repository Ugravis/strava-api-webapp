"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { AdminStationRailway } from "@kilotrace/shared/admin";
import { LngLatBounds, Map as MapLibreMap, NavigationControl } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { setVisitedCountries } from "@kilotrace/ui/lib/map/country-layer";
import { BASE_STYLE_URL, mapPalette, recolorStyle } from "@kilotrace/ui/lib/map/map-style";
import { stationData } from "@kilotrace/ui/lib/map/station-data";
import { addStationLayers, setHoveredStation, stationNear, type StationPick } from "@kilotrace/ui/lib/map/stations-layer";
import "@/lib/map/maplibre-worker";
import { adminTilesUrl } from "@/lib/map/tiles";
import { loadMapVersion } from "../map/actions";
import { loadStationRailway } from "./actions";

/** Room around the stations framed, in pixels: their name bubbles above them, the zoom buttons on the right. */
const PADDING = { top: 56, bottom: 24, left: 32, right: 56 };
/** Deepest zoom of the frame: a station alone, or its neighbors at a few metres, shown with its tracks around. */
const MAX_ZOOM = 15;

/**
 * The banner of a station: the station and those the railway links it to,
 * nothing else, drawn as on the map of the dataset, every country in its colour. The map moves; a click on a
 * neighbor opens it (`onOpen`).
 */
export function StationRailwayMap({ id, onOpen }: { id: string; onOpen: (id: string) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const { resolvedTheme } = useTheme();
  const palette = useMemo(() => mapPalette(resolvedTheme), [resolvedTheme]);
  // The railway of the station loaded last, null when it failed: another station waits for its own.
  const [loaded, setLoaded] = useState<{ id: string; railway: (AdminStationRailway & { countries: string }) | null } | null>(null);
  const current = loaded?.id === id ? loaded : null;
  const railway = current?.railway ?? null;
  const failed = current !== null && railway === null;
  // Read by the handlers of the map, created once with it.
  const state = useRef({ palette, railway, onOpen });
  useLayoutEffect(() => {
    state.current = { palette, railway, onOpen };
  });

  useEffect(() => {
    let live = true;
    Promise.all([loadStationRailway(id), loadMapVersion()]).then(
      ([railway, versions]) => live && setLoaded({ id, railway: { ...railway, countries: versions.countries } }),
      () => live && setLoaded({ id, railway: null }),
    );
    return () => {
      live = false;
    };
  }, [id]);

  // The map once the railway is known: framed on the stations, the station shown ringed.
  useEffect(() => {
    if (!railway || !container.current) return;
    const bounds = new LngLatBounds();
    for (const { lon, lat } of railway.stations) bounds.extend([lon, lat]);
    const map = new MapLibreMap({
      container: container.current,
      bounds,
      fitBoundsOptions: { padding: PADDING, maxZoom: MAX_ZOOM },
      attributionControl: { compact: true },
      dragRotate: false,
      pitchWithRotate: false,
    });
    mapRef.current = map;
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    // Folded at once, the button (i) left: the banner is small.
    map.once("load", () => container.current?.querySelector(".maplibregl-compact-show")?.classList.remove("maplibregl-compact-show"));
    map.on("style.load", () => {
      const { palette, railway } = state.current;
      if (!railway) return;
      const station = railway.stations.find((one) => String(one.id) === id);
      const selected: StationPick | null = station ? { id: station.id, lon: station.lon, lat: station.lat, name: station.name } : null;
      const firstLabel = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
      // Every country in its colour, as on the map of the dataset.
      setVisitedCountries(map, { codes: [], shapesVersion: railway.countries }, palette, ({ shapesVersion }) => adminTilesUrl("countries", shapesVersion));
      addStationLayers(map, stationData(railway), selected, null, palette, true, false, firstLabel);
    });
    map.on("click", (event) => {
      const station = stationNear(map, event.point);
      if (station && String(station.id) !== id) state.current.onOpen(String(station.id));
    });
    // The neighbor under the pointer is haloed, a hand over it.
    map.on("mousemove", (event) => {
      if (map.isMoving()) return;
      const station = stationNear(map, event.point);
      const neighbor = station && String(station.id) !== id ? station : null;
      map.getCanvas().style.cursor = neighbor ? "pointer" : "";
      setHoveredStation(map, neighbor);
    });
    map.on("mouseout", () => setHoveredStation(map, null));
    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [railway, id]);

  // The base map in the colors of the theme, the layers added again once it is loaded.
  useEffect(() => {
    mapRef.current?.setStyle(BASE_STYLE_URL, { diff: false, transformStyle: (_, next) => recolorStyle(next, palette) });
  }, [palette, railway]);

  if (failed)
    return <div className="flex h-56 w-full shrink-0 items-center justify-center border-b bg-muted text-xs text-muted-foreground">Carte indisponible</div>;
  return (
    <div className="relative h-56 w-full shrink-0 border-b bg-muted">
      <div ref={container} className="size-full" />
      {!railway && <Skeleton className="absolute inset-0 rounded-none" />}
    </div>
  );
}
