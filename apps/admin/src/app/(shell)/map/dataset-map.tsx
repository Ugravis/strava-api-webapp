"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { AdminMapVersion } from "@kilotrace/shared/admin";
import { Map as MapLibreMap, NavigationControl, setWorkerUrl } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import { useSplitPanel } from "@kilotrace/ui/components/split-panel";
import { setVisitedCountries } from "@kilotrace/ui/lib/map/country-layer";
import { BASE_STYLE_URL, DEFAULT_VIEW, mapPalette, recolorStyle } from "@kilotrace/ui/lib/map/map-style";
import { centerStation, type MapInsets, type StationBounds, stationCut } from "@kilotrace/ui/lib/map/station-camera";
import {
  addStationLayers,
  drawEveryStation,
  NO_STATION_DATA,
  setAllStations,
  setHoveredStation,
  setSelectedStation,
  stationNear,
  type StationPick,
} from "@kilotrace/ui/lib/map/stations-layer";
import { type StationRights, useStationsVersion } from "../stations/station-bits";
import { StationRowPanel } from "../stations/station-detail";
import { locateStation } from "./actions";

// MapLibre derives its worker URL from its own location at runtime, which the
// bundler cannot follow: the worker is declared here so that it is emitted.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

/** As on the public map: the stations are hovered from this zoom, the zoom the tiles are clicked from. */
const HOVER_MIN_ZOOM = 8;
/** First zoom of the tiles of every station (`AdminMapController`): the railway from the furthest out. */
const STATIONS_MIN_ZOOM = 0;

/** Tiles of the map of the back office, relayed by `/map-tiles` with the session. Absolute: MapLibre fetches them from its worker. */
const tilesUrl = (source: "stations" | "countries", version: string) =>
  `${window.location.origin}/map-tiles/${source}/{z}/{x}/{y}?v=${encodeURIComponent(version)}`;

/** Room the side panel takes over the map, when it floats over it: the map shrinks beside it otherwise. */
function insetsOf(map: MapLibreMap): MapInsets {
  const panel = document.querySelector<HTMLElement>('aside[aria-label="Détail"]');
  if (!panel || panel.inert) return { right: 0, bottom: 0 };
  const { right } = map.getContainer().getBoundingClientRect();
  return { right: Math.max(0, right - panel.getBoundingClientRect().left), bottom: 0 };
}

/**
 * The public map with every station visited, drawn by its own layers to
 * audit it: the hidden stations in grey, every country visited. A station
 * hovered or clicked behaves as on the public map, its detail in the side
 * panel, which `?row=` follows (a link from the stations page, back and
 * forward).
 */
export function DatasetMap({ versions: serverVersions, rights }: { versions: AdminMapVersion; rights: StationRights }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const { resolvedTheme } = useTheme();
  const palette = useMemo(() => mapPalette(resolvedTheme), [resolvedTheme]);
  const edits = useStationsVersion();
  // A change of a station in the panel: its tiles under a new URL.
  const versions = useMemo(() => ({ ...serverVersions, stations: `${serverVersions.stations}.${edits}` }), [serverVersions, edits]);
  const { open, setTitle, isOpen, activeId } = useSplitPanel();
  const selectedId = isOpen ? activeId : null;

  // Read by the handlers of the map, created once with it.
  const state = useRef({ palette, versions });
  /** The station shown, ringed, and the bounds of its zone. */
  const selected = useRef<{ pick: StationPick; bounds: StationBounds } | null>(null);
  const hovered = useRef<StationPick | null>(null);
  /** The station just picked on the map: unlike a station reached otherwise, the camera stays. */
  const picked = useRef<string | null>(null);
  const openRef = useRef<(id: string, name?: string | null) => void>(() => {});

  /** Centers the station shown beside the panel, zoomed in like a small tile (`zoomIn`) or as it is. */
  const center = useCallback((zoomIn: boolean) => {
    const map = mapRef.current;
    const shown = selected.current;
    if (map && shown) centerStation(map, shown.pick, shown.bounds, insetsOf(map), zoomIn);
  }, []);

  const openStation = useCallback(
    (id: string, name?: string | null) => {
      const panel = { open: (next: string) => openRef.current(next) };
      open(<StationRowPanel id={id} rights={rights} panel={panel} onCenter={() => center(true)} />, { id, title: name ?? "Gare" });
      if (name === undefined) locateStation(id).then((station) => station && setTitle(id, station.name ?? "Sans nom"));
    },
    [open, setTitle, rights, center],
  );
  useLayoutEffect(() => {
    state.current = { palette, versions };
    openRef.current = openStation;
  });

  useEffect(() => {
    const map = new MapLibreMap({ container: container.current!, ...DEFAULT_VIEW, attributionControl: { compact: true }, dragRotate: false, pitchWithRotate: false });
    mapRef.current = map;
    drawEveryStation(map, { url: (version) => tilesUrl("stations", version), version: state.current.versions.stations, minzoom: STATIONS_MIN_ZOOM });
    map.touchZoomRotate.disableRotation();
    map.addControl(new NavigationControl({ showCompass: false }), "top-right");
    map.on("style.load", () => {
      const { palette, versions } = state.current;
      // Below the first label layer, as on the public map.
      const firstLabel = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
      setVisitedCountries(map, { codes: [], shapesVersion: versions.countries }, palette, ({ shapesVersion }) => tilesUrl("countries", shapesVersion));
      addStationLayers(map, NO_STATION_DATA, selected.current?.pick ?? null, hovered.current, palette, true, false, firstLabel);
      setAllStations(map, versions.stations, palette, true);
    });
    map.on("click", (event) => {
      const station = stationNear(map, event.point);
      if (!station) return;
      picked.current = String(station.id);
      openRef.current(String(station.id), station.name ?? null);
    });
    // The station under the pointer is haloed: looked for once per frame, and not while the map moves.
    let pointer: { x: number; y: number } | null = null;
    let frame = 0;
    const hover = (station: StationPick | null) => {
      map.getCanvas().style.cursor = station ? "pointer" : "";
      if (station?.id === hovered.current?.id) return;
      hovered.current = station;
      setHoveredStation(map, station);
    };
    const pickHovered = () => {
      frame = 0;
      const still = pointer !== null && !map.isMoving();
      hover(still && map.getZoom() >= HOVER_MIN_ZOOM ? stationNear(map, pointer!) : null);
    };
    map.on("mousemove", (event) => {
      pointer = event.point;
      if (!frame) frame = requestAnimationFrame(pickHovered);
    });
    map.on("mouseout", () => {
      pointer = null;
      hover(null);
    });
    map.on("movestart", () => hover(null));
    map.on("moveend", pickHovered);
    return () => {
      cancelAnimationFrame(frame);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // The base map in the colors of the theme, the layers added again once it is loaded.
  useEffect(() => {
    mapRef.current?.setStyle(BASE_STYLE_URL, { diff: false, transformStyle: (_, next) => recolorStyle(next, palette) });
  }, [palette]);

  useEffect(() => {
    const map = mapRef.current;
    if (map?.isStyleLoaded()) setAllStations(map, versions.stations, palette, true);
  }, [versions, palette]);

  // The station of the panel ringed and, unless just picked on the map whole, centered beside the panel.
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (!selectedId) {
      selected.current = null;
      setSelectedStation(map, null);
      return;
    }
    let live = true;
    locateStation(selectedId).then((station) => {
      if (!live || !station) return;
      const pick = { id: station.id, lon: station.lon, lat: station.lat, name: station.name };
      const bounds = station.bounds ?? { west: station.lon, east: station.lon, south: station.lat, north: station.lat };
      selected.current = { pick, bounds };
      setSelectedStation(map, pick);
      if (picked.current === selectedId) {
        picked.current = null;
        if (stationCut(map, bounds, insetsOf(map))) center(false);
        return;
      }
      center(true);
    });
    return () => {
      live = false;
    };
  }, [selectedId, center]);

  // A shared link (`?row=`): the station opened on arrival.
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("row");
    if (id && /^\d+$/.test(id)) openRef.current(id);
  }, []);

  return <div ref={container} className="min-h-0 flex-1 bg-muted" />;
}
