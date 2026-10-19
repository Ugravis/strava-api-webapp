import type { FeatureCollection, LineString, Point } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  VectorTileSource,
} from "maplibre-gl";
import type { VisitedStations } from "@/lib/api/types";
import type { MapHistory } from "./history-layer";
import type { MapPalette } from "./map-style";
import { SECTOR_VEIL_LAYER_ID } from "./sector-layer";

/** What the stations layer draws: the visited stations and the links unlocked between them. */
export interface StationData {
  stations: FeatureCollection<Point, { id: number }>;
  links: FeatureCollection<LineString>;
}

/** A station under the pointer. */
export interface StationPick {
  id: number;
  lon: number;
  lat: number;
}

const SOURCES = {
  all: "all-stations",
  visited: "visited-stations",
  links: "rail-links",
  selected: "station-selected",
} as const;

const LAYERS = {
  unvisited: "stations-unvisited",
  linksCasing: "rail-links-casing",
  links: "rail-links-line",
  visited: "stations-visited",
  selected: "station-selected-ring",
} as const;

/** Veil over the base map, the tiles and the tracks, below the stations: they stand out. */
const DIM_LAYER_ID = "stations-dim-veil";
/** Opacity of the veil, in the color of the land: the map stays readable around the stations. */
const DIM_OPACITY = 0.6;

/** Layer of the vector tiles of every station, served by the backend. */
const ALL_SOURCE_LAYER = "stations";
/** The backend serves every station from this zoom, down to the deepest; the map stretches them beyond. */
const ALL_MIN_ZOOM = 6;
const ALL_MAX_ZOOM = 14;
/** Distance from the pointer, in pixels, where a click looks for a station: a finger is not precise. */
const PICK_TOLERANCE_PX = 8;

const EMPTY_POINTS: FeatureCollection<Point, { id: number }> = { type: "FeatureCollection", features: [] };
const EMPTY_LINES: FeatureCollection<LineString> = { type: "FeatureCollection", features: [] };
export const NO_STATION_DATA: StationData = { stations: EMPTY_POINTS, links: EMPTY_LINES };

/** Grows with the zoom, from a dot on a country to a marker on a town. */
function byZoom(at6: number, at10: number, at14: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], ALL_MIN_ZOOM, at6, 10, at10, 14, at14];
}

/** Whether a first visit counts for the history: the map as it was then, or what was gained since. */
function inHistory(firstVisitAt: string | null, history: MapHistory | null): boolean {
  if (!history) return true;
  const gained = firstVisitAt !== null && firstVisitAt >= history.instant;
  // A visit not dated yet counts as an old one.
  return history.mode === "gained" ? gained : !gained;
}

/**
 * The visited stations and the links between them, as of the history when
 * open: a link is unlocked by the later of the first visits of its stations.
 */
export function stationData(visited: VisitedStations | null, history: MapHistory | null): StationData {
  if (!visited) return NO_STATION_DATA;
  const firstVisits = new Map<number, string | null>();
  const features: StationData["stations"]["features"] = [];
  for (const station of visited.stations) {
    if (!inHistory(station.firstVisitAt, history)) continue;
    firstVisits.set(station.id, station.firstVisitAt);
    features.push({
      type: "Feature",
      id: station.id,
      properties: { id: station.id },
      geometry: { type: "Point", coordinates: [station.lon, station.lat] },
    });
  }
  const links: StationData["links"]["features"] = [];
  for (const link of visited.links) {
    const [a, b] = link.stations.map((id) => firstVisits.get(id));
    if (a === undefined || b === undefined) continue;
    const unlockedAt = a === null || b === null ? (a ?? b) : a > b ? a : b;
    if (!inHistory(unlockedAt, history)) continue;
    links.push({
      type: "Feature",
      id: link.id,
      properties: {},
      geometry: { type: "LineString", coordinates: link.coords },
    });
  }
  return { stations: { type: "FeatureCollection", features }, links: { type: "FeatureCollection", features: links } };
}

/** The version is part of the URL: the browser caches the stations of each import. */
function allStationsUrl(version: string): string {
  // Absolute: MapLibre fetches the tiles from its worker.
  return `${window.location.origin}/api/stations/vector/{z}/{x}/{y}?v=${version}`;
}

function selectedData(station: StationPick | null): FeatureCollection<Point, { id: number }> {
  if (!station) return EMPTY_POINTS;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: station.id },
        geometry: { type: "Point", coordinates: [station.lon, station.lat] },
      },
    ],
  };
}

const visibility = (visible: boolean) => (visible ? "visible" : "none");

/**
 * Adds the stations layer: the veil dimming the map when asked, every
 * station in grey, the railway unlocked between the visited stations, below
 * the labels like the tracks, then the visited stations and the one
 * selected, over the labels but below the veil of the sector. Hidden layers
 * load nothing.
 */
export function addStationLayers(
  map: MapLibreMap,
  data: StationData,
  selected: StationPick | null,
  palette: MapPalette,
  visible: boolean,
  dimmed: boolean,
  belowLabels: string | undefined,
): void {
  if (map.getSource(SOURCES.visited)) return;
  const top = map.getLayer(SECTOR_VEIL_LAYER_ID) ? SECTOR_VEIL_LAYER_ID : undefined;
  const layout = { visibility: visibility(visible) } as const;
  map.addLayer(
    {
      id: DIM_LAYER_ID,
      type: "background",
      layout: { visibility: visibility(dimmed) },
      paint: { "background-color": palette.base.land, "background-opacity": DIM_OPACITY },
    },
    belowLabels,
  );
  map.addSource(SOURCES.links, { type: "geojson", data: data.links });
  map.addSource(SOURCES.visited, { type: "geojson", data: data.stations });
  map.addSource(SOURCES.selected, { type: "geojson", data: selectedData(selected) });
  map.addLayer(
    {
      id: LAYERS.linksCasing,
      type: "line",
      source: SOURCES.links,
      layout: { ...layout, "line-join": "round", "line-cap": "round" },
      paint: { "line-color": palette.stationCasing, "line-opacity": 0.8, "line-width": byZoom(2.5, 4, 6) },
    },
    belowLabels,
  );
  map.addLayer(
    {
      id: LAYERS.links,
      type: "line",
      source: SOURCES.links,
      layout: { ...layout, "line-join": "round", "line-cap": "round" },
      paint: { "line-color": palette.railLink, "line-width": byZoom(1.2, 2, 3.5) },
    },
    belowLabels,
  );
  map.addLayer(
    {
      id: LAYERS.visited,
      type: "circle",
      source: SOURCES.visited,
      layout,
      paint: {
        "circle-color": palette.station,
        "circle-radius": byZoom(2.5, 4, 6),
        "circle-stroke-color": palette.stationCasing,
        "circle-stroke-width": byZoom(1, 1.5, 2),
      },
    },
    top,
  );
  map.addLayer(
    {
      id: LAYERS.selected,
      type: "circle",
      source: SOURCES.selected,
      layout,
      paint: {
        "circle-color": "transparent",
        "circle-radius": byZoom(6, 8, 10),
        "circle-stroke-color": palette.highlight,
        "circle-stroke-opacity": 0.85,
        "circle-stroke-width": 2,
      },
    },
    top,
  );
}

/**
 * Adds or replaces the grey stations once the version of the import is
 * known, below the visited ones. Each version gets its own source: a vector
 * source whose first tiles were empty would keep drawing nothing after
 * `setTiles`.
 */
export function setAllStations(map: MapLibreMap, version: string | null, palette: MapPalette, visible: boolean): void {
  if (!map.getLayer(LAYERS.visited)) return;
  const url = version ? allStationsUrl(version) : null;
  const source = map.getSource<VectorTileSource>(SOURCES.all);
  if (source && source.tiles[0] === url) return;
  if (map.getLayer(LAYERS.unvisited)) map.removeLayer(LAYERS.unvisited);
  if (source) map.removeSource(SOURCES.all);
  if (!url) return;
  map.addSource(SOURCES.all, { type: "vector", tiles: [url], minzoom: ALL_MIN_ZOOM, maxzoom: ALL_MAX_ZOOM });
  map.addLayer(
    {
      id: LAYERS.unvisited,
      type: "circle",
      source: SOURCES.all,
      "source-layer": ALL_SOURCE_LAYER,
      layout: { visibility: visibility(visible) },
      paint: {
        "circle-color": palette.stationUnvisited,
        "circle-opacity": byZoom(0.6, 0.8, 0.9),
        "circle-radius": byZoom(1.5, 2.5, 4),
        "circle-stroke-color": palette.stationCasing,
        "circle-stroke-opacity": byZoom(0, 0.6, 0.8),
        "circle-stroke-width": byZoom(0, 0.8, 1.2),
      },
    },
    LAYERS.visited,
  );
}

/** Shows the visited stations and the links of `data`; ignored until the layers are added. */
export function setStationData(map: MapLibreMap, data: StationData): void {
  map.getSource<GeoJSONSource>(SOURCES.visited)?.setData(data.stations);
  map.getSource<GeoJSONSource>(SOURCES.links)?.setData(data.links);
}

/** Rings the station shown in the panel, or none. */
export function setSelectedStation(map: MapLibreMap, station: StationPick | null): void {
  map.getSource<GeoJSONSource>(SOURCES.selected)?.setData(selectedData(station));
}

export function setStationsVisible(map: MapLibreMap, visible: boolean): void {
  for (const id of Object.values(LAYERS)) {
    if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility(visible));
  }
}

/** Dims the map below the stations, or not; ignored until the layers are added. */
export function setMapDimmed(map: MapLibreMap, dimmed: boolean): void {
  if (map.getLayer(DIM_LAYER_ID)) map.setLayoutProperty(DIM_LAYER_ID, "visibility", visibility(dimmed));
}

/** The station drawn under the pointer or a few pixels from it, visited ones first; null without any. */
export function stationNear(map: MapLibreMap, point: { x: number; y: number }): StationPick | null {
  const layers = [LAYERS.visited, LAYERS.unvisited].filter((id) => map.getLayer(id));
  if (layers.length === 0 || map.getLayoutProperty(LAYERS.visited, "visibility") === "none") return null;
  const features: MapGeoJSONFeature[] = map.queryRenderedFeatures(
    [
      [point.x - PICK_TOLERANCE_PX, point.y - PICK_TOLERANCE_PX],
      [point.x + PICK_TOLERANCE_PX, point.y + PICK_TOLERANCE_PX],
    ],
    { layers },
  );
  // The nearest of those found, visited or not: their markers overlap.
  let best: { pick: StationPick; distance: number } | null = null;
  for (const feature of features) {
    if (feature.geometry.type !== "Point") continue;
    const [lon, lat] = feature.geometry.coordinates;
    const id = Number(feature.id ?? feature.properties.id);
    if (!Number.isSafeInteger(id)) continue;
    const projected = map.project([lon, lat]);
    const distance = Math.hypot(projected.x - point.x, projected.y - point.y);
    if (!best || distance < best.distance) best = { pick: { id, lon, lat }, distance };
  }
  return best?.pick ?? null;
}
