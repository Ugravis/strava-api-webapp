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
import { FADE_ZOOMS, fadeIn, type MapPalette } from "./map-style";
import { SECTOR_VEIL_LAYER_ID } from "./sector-layer";
import { addStationIcons, STATION_ICONS } from "./station-icons";
import { TRAIN_SIZE, TRAINS_MIN_ZOOM, TRAINS_SOURCE } from "./train-traffic";

/** What the stations layer draws: the visited stations and the links unlocked between them. */
export interface StationData {
  stations: FeatureCollection<Point, { id: number; name: string | null }>;
  links: FeatureCollection<LineString, LinkProperties>;
}

/** A station at an end of a link. */
export interface LinkEnd {
  id: number;
  name: string | null;
  lon: number;
  lat: number;
}

/** The stations at the first and last points of a link. */
export interface LinkProperties {
  start: LinkEnd;
  end: LinkEnd;
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
  hovered: "station-hovered",
  trains: TRAINS_SOURCE,
} as const;

const LAYERS = {
  unvisited: "stations-unvisited",
  linksCasing: "rail-links-casing",
  ties: "rail-links-ties",
  links: "rail-links-line",
  visited: "stations-visited",
  trains: "station-trains-icon",
  unvisitedIcon: "stations-unvisited-icon",
  visitedIcon: "stations-visited-icon",
  names: "stations-visited-name",
  hovered: "station-hovered-ring",
  selected: "station-selected-ring",
} as const;

/**
 * Zoomed in, the dots give way to icons, the visited stations to their name
 * in a bubble, and the trains run: both cross-fade over one zoom level.
 */
const ICON_MIN_ZOOM = TRAINS_MIN_ZOOM;
const ICONS_IN = fadeIn(ICON_MIN_ZOOM, 1);
const DOTS_OUT: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], ICON_MIN_ZOOM, 1, ICON_MIN_ZOOM + FADE_ZOOMS, 0];
const ICON_SIZE: ExpressionSpecification = ["interpolate", ["linear"], ["zoom"], ICON_MIN_ZOOM, 0.75, 16, 1.1];
const NAME_FONT = ["Noto Sans Bold"];
/** The links show their sleepers from this zoom, fading in: they look like rails. */
const TIES_MIN_ZOOM = 13;

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

const EMPTY_POINTS: FeatureCollection<Point, { id: number; name: string | null }> = {
  type: "FeatureCollection",
  features: [],
};
const EMPTY_LINES: FeatureCollection<LineString, LinkProperties> = { type: "FeatureCollection", features: [] };
export const NO_STATION_DATA: StationData = { stations: EMPTY_POINTS, links: EMPTY_LINES };

/** Grows with the zoom, from a dot on a country to a marker on a town. */
function byZoom(at6: number, at10: number, at14: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], ALL_MIN_ZOOM, at6, 10, at10, 14, at14];
}

/** Radius of a ring around a station: around its dot, then around its icon. */
function ringRadius(gap: number): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], ALL_MIN_ZOOM, 4 + gap, 10, 6 + gap, ICON_MIN_ZOOM, 7 + gap, 16, 11 + gap];
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
  const ends = new Map<number, LinkEnd>();
  const features: StationData["stations"]["features"] = [];
  for (const station of visited.stations) {
    if (!inHistory(station.firstVisitAt, history)) continue;
    firstVisits.set(station.id, station.firstVisitAt);
    ends.set(station.id, { id: station.id, name: station.name, lon: station.lon, lat: station.lat });
    features.push({
      type: "Feature",
      id: station.id,
      properties: { id: station.id, name: station.name },
      geometry: { type: "Point", coordinates: [station.lon, station.lat] },
    });
  }
  const links: StationData["links"]["features"] = [];
  for (const link of visited.links) {
    const [a, b] = link.stations.map((id) => firstVisits.get(id));
    if (a === undefined || b === undefined) continue;
    const unlockedAt = a === null || b === null ? (a ?? b) : a > b ? a : b;
    if (!inHistory(unlockedAt, history)) continue;
    const [first, second] = link.stations.map((id) => ends.get(id)!);
    // The station nearest the first point starts the link.
    const [lon, lat] = link.coords[0];
    const startsAtFirst = Math.hypot(first.lon - lon, first.lat - lat) <= Math.hypot(second.lon - lon, second.lat - lat);
    links.push({
      type: "Feature",
      id: link.id,
      properties: startsAtFirst ? { start: first, end: second } : { start: second, end: first },
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

function ringData(station: StationPick | null): FeatureCollection<Point, { id: number; name: string | null }> {
  if (!station) return EMPTY_POINTS;
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        properties: { id: station.id, name: null },
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
  hovered: StationPick | null,
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
  map.addSource(SOURCES.selected, { type: "geojson", data: ringData(selected) });
  map.addSource(SOURCES.hovered, { type: "geojson", data: ringData(hovered) });
  map.addSource(SOURCES.trains, { type: "geojson", data: EMPTY_POINTS });
  addStationIcons(map, palette);
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
  // Short wide dashes across the line: the sleepers.
  map.addLayer(
    {
      id: LAYERS.ties,
      type: "line",
      source: SOURCES.links,
      minzoom: TIES_MIN_ZOOM,
      layout: { ...layout, "line-join": "round" },
      paint: {
        "line-color": palette.railLink,
        "line-opacity": fadeIn(TIES_MIN_ZOOM, 0.7),
        "line-width": ["interpolate", ["linear"], ["zoom"], TIES_MIN_ZOOM, 6, 16, 9, 18, 14],
        "line-dasharray": [0.18, 0.7],
      },
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
      maxzoom: ICON_MIN_ZOOM + FADE_ZOOMS,
      paint: {
        "circle-color": palette.station,
        "circle-opacity": DOTS_OUT,
        "circle-radius": byZoom(2.5, 4, 6),
        "circle-stroke-color": palette.stationCasing,
        "circle-stroke-opacity": DOTS_OUT,
        "circle-stroke-width": byZoom(1, 1.5, 2),
      },
    },
    top,
  );
  // Below the stations: a train stops under their icon.
  map.addLayer(
    {
      id: LAYERS.trains,
      type: "symbol",
      source: SOURCES.trains,
      minzoom: ICON_MIN_ZOOM,
      layout: {
        ...layout,
        "icon-image": ["get", "image"],
        "icon-size": TRAIN_SIZE,
        "icon-rotate": ["get", "bearing"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
      paint: {
        "icon-opacity": ["interpolate", ["linear"], ["zoom"], ICON_MIN_ZOOM, 0, ICON_MIN_ZOOM + FADE_ZOOMS, ["get", "opacity"]],
      },
    },
    LAYERS.visited,
  );
  map.addLayer(
    {
      id: LAYERS.visitedIcon,
      type: "symbol",
      source: SOURCES.visited,
      minzoom: ICON_MIN_ZOOM,
      layout: { ...layout, ...iconLayout(STATION_ICONS.visited) },
      paint: { "icon-opacity": ICONS_IN },
    },
    top,
  );
  // Names collide with each other and push the place names of the base map aside.
  map.addLayer(
    {
      id: LAYERS.names,
      type: "symbol",
      source: SOURCES.visited,
      minzoom: ICON_MIN_ZOOM,
      layout: {
        ...layout,
        "text-field": ["coalesce", ["get", "name"], ""],
        "text-font": NAME_FONT,
        "text-size": 11.5,
        "text-anchor": "bottom",
        "text-offset": ["interpolate", ["linear"], ["zoom"], ICON_MIN_ZOOM, ["literal", [0, -1.55]], 16, ["literal", [0, -1.9]]],
        "text-max-width": 12,
        "icon-image": STATION_ICONS.bubble,
        "icon-text-fit": "both",
        "icon-text-fit-padding": [2, 6, 2, 6],
        "icon-anchor": "bottom",
      },
      paint: { "text-color": palette.stationCasing, "text-opacity": ICONS_IN, "icon-opacity": ICONS_IN },
    },
    top,
  );
  for (const [id, source, opacity, width] of [
    [LAYERS.hovered, SOURCES.hovered, 0.35, 1],
    [LAYERS.selected, SOURCES.selected, 0.85, 2],
  ] as const) {
    map.addLayer(
      {
        id,
        type: "circle",
        source,
        layout,
        paint: {
          "circle-color": "transparent",
          "circle-radius": ringRadius(width + 1),
          "circle-stroke-color": palette.highlight,
          "circle-stroke-opacity": opacity,
          "circle-stroke-width": width,
        },
      },
      top,
    );
  }
}

/** Icon of a station, always drawn: it never hides a name nor gets hidden. */
function iconLayout(image: string) {
  return {
    "icon-image": image,
    "icon-size": ICON_SIZE,
    "icon-allow-overlap": true,
    "icon-ignore-placement": true,
  } as const;
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
  if (map.getLayer(LAYERS.unvisitedIcon)) map.removeLayer(LAYERS.unvisitedIcon);
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
      maxzoom: ICON_MIN_ZOOM + FADE_ZOOMS,
      paint: {
        "circle-color": palette.stationUnvisited,
        // Fading in from where the backend serves them, like every layer of the map, out for the icons.
        "circle-opacity": [
          "interpolate",
          ["linear"],
          ["zoom"],
          ALL_MIN_ZOOM,
          0,
          ALL_MIN_ZOOM + FADE_ZOOMS,
          0.65,
          10,
          0.8,
          ICON_MIN_ZOOM,
          0.85,
          ICON_MIN_ZOOM + FADE_ZOOMS,
          0,
        ],
        "circle-radius": byZoom(1.5, 2.5, 4),
        "circle-stroke-color": palette.stationCasing,
        "circle-stroke-opacity": ["interpolate", ["linear"], ["zoom"], ALL_MIN_ZOOM, 0, 10, 0.6, ICON_MIN_ZOOM, 0.7, ICON_MIN_ZOOM + FADE_ZOOMS, 0],
        "circle-stroke-width": byZoom(0, 0.8, 1.2),
      },
    },
    LAYERS.visited,
  );
  map.addLayer(
    {
      id: LAYERS.unvisitedIcon,
      type: "symbol",
      source: SOURCES.all,
      "source-layer": ALL_SOURCE_LAYER,
      minzoom: ICON_MIN_ZOOM,
      layout: { visibility: visibility(visible), ...iconLayout(STATION_ICONS.unvisited) },
      paint: { "icon-opacity": fadeIn(ICON_MIN_ZOOM, 0.9) },
    },
    LAYERS.visitedIcon,
  );
}

/** Shows the visited stations and the links of `data`; ignored until the layers are added. */
export function setStationData(map: MapLibreMap, data: StationData): void {
  map.getSource<GeoJSONSource>(SOURCES.visited)?.setData(data.stations);
  map.getSource<GeoJSONSource>(SOURCES.links)?.setData(data.links);
}

/** Rings the station shown in the panel, or none. */
export function setSelectedStation(map: MapLibreMap, station: StationPick | null): void {
  map.getSource<GeoJSONSource>(SOURCES.selected)?.setData(ringData(station));
}

/** Rings the station under the pointer, discreetly: a click opens it. */
export function setHoveredStation(map: MapLibreMap, station: StationPick | null): void {
  map.getSource<GeoJSONSource>(SOURCES.hovered)?.setData(ringData(station));
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

/** Id of the train drawn under the pointer or a few pixels from it; null without any. */
export function trainNear(map: MapLibreMap, point: { x: number; y: number }): number | null {
  if (!map.getLayer(LAYERS.trains) || map.getLayoutProperty(LAYERS.trains, "visibility") === "none") return null;
  if (map.getZoom() < TRAINS_MIN_ZOOM) return null;
  const [feature] = map.queryRenderedFeatures(
    [
      [point.x - PICK_TOLERANCE_PX, point.y - PICK_TOLERANCE_PX],
      [point.x + PICK_TOLERANCE_PX, point.y + PICK_TOLERANCE_PX],
    ],
    { layers: [LAYERS.trains] },
  );
  const id = Number(feature?.properties.train);
  return Number.isSafeInteger(id) ? id : null;
}

/** The station drawn under the pointer or a few pixels from it, visited ones first; null without any. */
export function stationNear(map: MapLibreMap, point: { x: number; y: number }): StationPick | null {
  const layers = [LAYERS.visited, LAYERS.visitedIcon, LAYERS.unvisited, LAYERS.unvisitedIcon].filter((id) =>
    map.getLayer(id),
  );
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
