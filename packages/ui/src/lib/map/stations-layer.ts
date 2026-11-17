import type { FeatureCollection, LineString, Point } from "geojson";
import type {
  ExpressionSpecification,
  GeoJSONSource,
  Map as MapLibreMap,
  MapGeoJSONFeature,
  SymbolLayerSpecification,
  VectorTileSource,
} from "maplibre-gl";
import { SECTOR_VEIL_LAYER_ID, TRAINS_MIN_ZOOM, TRAINS_SOURCE } from "./layer-order";
import { FADE_ZOOMS, fadeIn, type MapPalette } from "./map-style";
import { addRailTies, refreshRailTies, setRailTies, TIES_LAYER, TIES_MIN_ZOOM } from "./rail-ties";
import { realScale, TRAIN_SIZE } from "./real-scale";
import { StationBubble } from "./station-bubble";
import { addStationIcons, glyphUrl, HATCH_LEVELS, STATION_ICONS } from "./station-icons";

/** Whether a station or a link was gained in the period of the history: drawn in the pink of the gains. */
interface Gained {
  gained?: boolean;
}

/** What the stations layer draws: the visited stations and the links unlocked between them. */
export interface StationData {
  stations: FeatureCollection<
    Point,
    { id: number; name: string | null } & Gained
  >;
  links: FeatureCollection<LineString, LinkProperties & Gained>;
  /** The links cut where they diverge: their ties are drawn once. */
  ties: FeatureCollection<LineString, Gained>;
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

/** A station under the pointer, with its name when known. */
export interface StationPick {
  id: number;
  lon: number;
  lat: number;
  name?: string | null;
}

const SOURCES = {
  all: "all-stations",
  visited: "visited-stations",
  links: "rail-links",
  ties: "rail-ties",
  selected: "station-selected",
  hovered: "station-hovered",
  trains: TRAINS_SOURCE,
} as const;

const LAYERS = {
  zones: "station-zones-fill",
  zoneOutlines: "station-zones-line",
  zoneHatch: "station-zone-selected-hatch",
  zoneShadow: "station-zone-selected-shadow",
  zoneSelected: "station-zone-selected-line",
  footprints: "station-footprints-fill",
  footprintOutlines: "station-footprints-line",
  footprintShadow: "station-footprint-selected-shadow",
  footprintSelected: "station-footprint-selected-line",
  unvisited: "stations-unvisited",
  linksCasing: "rail-links-casing",
  ties: TIES_LAYER,
  links: "rail-links-line",
  visited: "stations-visited",
  trains: "station-trains-icon",
  unvisitedNames: "stations-unvisited-name",
  names: "stations-visited-name",
  hovered: "station-hovered-ring",
  selected: "station-selected-ring",
  pulse: "station-selected-pulse",
} as const;

/**
 * The pulse of the station shown: a white disc growing from its center to the
 * edge of its halo while fading out, over and over, the halo swelling a little
 * (`swell`, a share of its radius) with it.
 */
const PULSE = { periodMs: 3000, frameMs: 33, opacity: 0.55, swell: 0.12 } as const;

/** Zoomed in, the stations show their name in a bubble over their dot, fading in. */
const NAMES_MIN_ZOOM = 11;
const NAMES_IN = fadeIn(NAMES_MIN_ZOOM, 1);
/** The grey bubbles let the map through a little. */
const UNVISITED_BUBBLE_OPACITY = 0.9;
const NAME_FONT = ["Noto Sans Bold"];
/** The line of the track, in pixels below the real scale: ticked from `TIES_MIN_ZOOM` (see `rail-ties`). */
const TRACK = { line: 2.4 } as const;
/** Opaque white border around the line, in pixels. */
const LINE_BORDER = 0.9;
/** Deepest tiles of the trains: precise enough to a few centimetres. */
const TRAINS_TILE_MAX_ZOOM = 16;
/** Deepest tiles of the ties. */
const TIES_TILE_MAX_ZOOM = 14;

/** Veil over the base map, the tiles and the tracks, below the stations: they stand out. */
const DIM_LAYER_ID = "stations-dim-veil";
/** Opacity of the veil, in the color of the land: the map stays readable around the stations. */
const DIM_OPACITY = 0.6;

/** Layers of the vector tiles of every station, served by the backend: the points, and the footprints from their zoom. */
const ALL_SOURCE_LAYER = "stations";
const FOOTPRINTS_SOURCE_LAYER = "station-footprints";
const ZONES_SOURCE_LAYER = "station-zones";
const FOOTPRINTS_MIN_ZOOM = 12;
/** First zoom of the sizes of the stations and the railway, growing from there. */
const ALL_MIN_ZOOM = 6;
/**
 * Zoom from which the dots of the stations fade in, visited or not: zoomed
 * out, the railway alone, the stations too many to tell apart. The backend
 * serves every station from there, down to the deepest; the map stretches
 * them beyond.
 */
const DOTS_MIN_ZOOM = 6;
/**
 * With the discreet dots (`setDiscreetDots`): the dots from a zoom sooner,
 * and below `DISCREET_DOTS_MAX_ZOOM` a plain disc of their color, a little
 * wider than the railway, to see the stations without hiding it. Their full
 * look, ringed, grows in over the zoom after. The backend serves every
 * station from `DISCREET_DOTS_MIN_ZOOM`.
 */
const DISCREET_DOTS_MIN_ZOOM = DOTS_MIN_ZOOM - 1;
const DISCREET_DOTS_MAX_ZOOM = DISCREET_DOTS_MIN_ZOOM + 2;
const ALL_MAX_ZOOM = 14;
/** Distance from the pointer, in pixels, where a click looks for a station: a finger is not precise. */
const PICK_TOLERANCE_PX = 8;

const EMPTY_POINTS: FeatureCollection<
  Point,
  { id: number; name: string | null }
> = {
  type: "FeatureCollection",
  features: [],
};
const EMPTY_LINES: FeatureCollection<LineString, LinkProperties> = {
  type: "FeatureCollection",
  features: [],
};
export const NO_STATION_DATA: StationData = {
  stations: EMPTY_POINTS,
  links: EMPTY_LINES,
  ties: { type: "FeatureCollection", features: [] },
};

/** Grows with the zoom, from a dot on a country to a marker on a town. */
function byZoom(
  at6: number,
  at10: number,
  at14: number,
): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    ALL_MIN_ZOOM,
    at6,
    10,
    at10,
    14,
    at14,
  ];
}

/**
 * Radius and ring of a dot, from its look at zooms 6, 10 and 14. With the
 * discreet dots: none and a plain disc of `discreet` pixels below
 * `DISCREET_DOTS_MAX_ZOOM` (a ring around nothing fills the disc).
 */
function dotSizes(
  map: MapLibreMap,
  discreet: number,
  radius: [number, number, number],
  ring: [number, number, number],
): { "circle-radius": ExpressionSpecification; "circle-stroke-width": ExpressionSpecification } {
  if (!discreetDots.has(map)) return { "circle-radius": byZoom(...radius), "circle-stroke-width": byZoom(...ring) };
  const grow = (from: number, [at6, at10, at14]: [number, number, number]): ExpressionSpecification => [
    "interpolate",
    ["linear"],
    ["zoom"],
    DISCREET_DOTS_MAX_ZOOM,
    from,
    DISCREET_DOTS_MAX_ZOOM + 1,
    at6,
    10,
    at10,
    14,
    at14,
  ];
  return { "circle-radius": grow(0, radius), "circle-stroke-width": grow(discreet, ring) };
}

/** Halo around the dot of the station under the pointer, then of the one shown: a soft disc, edged for the latter. */
const HALOS = {
  hovered: { radius: byZoom(7, 10, 13), fill: 0.16, edge: 0, edgeWidth: 0 },
  selected: { radius: byZoom(8, 11, 14), fill: 0.2, edge: 0.9, edgeWidth: 1.5 },
} as const;

/**
 * Name of a station after a small train, in a bubble whose tail touches its
 * dot (`lift`, in ems, at the zoom the names appear and from zoom 14).
 */
function nameLayout(
  bubble: string,
  lift: [number, number],
): SymbolLayerSpecification["layout"] {
  return {
    "text-field": [
      "format",
      ["image", STATION_ICONS.glyph],
      {},
      " ",
      {},
      ["get", "name"],
      {},
    ],
    "text-font": NAME_FONT,
    "text-size": 11.5,
    "text-anchor": "bottom",
    "text-offset": [
      "interpolate",
      ["linear"],
      ["zoom"],
      NAMES_MIN_ZOOM,
      ["literal", [0, -lift[0]]],
      14,
      ["literal", [0, -lift[1]]],
    ],
    "text-max-width": 12,
    "icon-image": bubble,
    "icon-text-fit": "both",
    "icon-text-fit-padding": [2, 6, 2, 6],
    "icon-anchor": "bottom",
  };
}

/** Stations with a name: the others get no bubble. */
const NAMED: ExpressionSpecification = ["to-boolean", ["get", "name"]];

/**
 * Tiles of every station with the railway between them (`rails`), each
 * station marked when the team hid it from the site (`hidden`): the map of
 * the back office draws them all as visited, the hidden ones as not, to
 * audit the public map with its own layers.
 */
export interface EveryStationTiles {
  /** URL of the tiles of a version of the data. */
  url: (version: string) => string;
  /** Version of the data the layers are added with. */
  version: string;
  /** First zoom of the tiles. */
  minzoom: number;
}

/** Maps drawing every station as visited, from their tiles. */
const everyStation = new WeakMap<MapLibreMap, EveryStationTiles>();
/** Layer of the railway in the tiles of every station. */
const RAILS_SOURCE_LAYER = "rails";
/** Layer of the ticks across the railway in the tiles of every station, laid out by the server. */
const TICKS_SOURCE_LAYER = "rail-ticks";

/**
 * Draws every station as visited from `tiles` instead of the visits of a
 * user, the hidden ones in grey. Called before the layers are added.
 */
export function drawEveryStation(map: MapLibreMap, tiles: EveryStationTiles): void {
  everyStation.set(map, tiles);
}

/**
 * Visited stations past which a map is dense: its dots show from
 * `DOTS_MIN_ZOOM` only. Below, every visited station shows at every zoom: the measures are for the maps holding an outsize network,
 * such as the one of the back office with every station.
 */
const DENSE_STATIONS = 3000;

/** Whether the map is dense: every station drawn, or more visited ones than `DENSE_STATIONS`. */
function isDense(map: MapLibreMap): boolean {
  return everyStation.has(map) || (visitedIds.get(map)?.length ?? 0) > DENSE_STATIONS;
}

/** Maps drawing the discreet dots, from a zoom sooner (`DISCREET_DOTS_MIN_ZOOM`). */
const discreetDots = new WeakSet<MapLibreMap>();
/** Zoom from which the dots of the map show on a dense map, and the backend serves every station. */
const dotsMinZoom = (map: MapLibreMap) => (discreetDots.has(map) ? DISCREET_DOTS_MIN_ZOOM : DOTS_MIN_ZOOM);
const VISITED_SIZES = [1.7, [1.6, 2.8, 4], [1.4, 2.2, 3]] as const;
const UNVISITED_SIZES = [1.4, [0.8, 1.8, 3], [1, 1.6, 2.2]] as const;
const visitedSizes = (map: MapLibreMap) => dotSizes(map, VISITED_SIZES[0], [...VISITED_SIZES[1]], [...VISITED_SIZES[2]]);
const unvisitedSizes = (map: MapLibreMap) => dotSizes(map, UNVISITED_SIZES[0], [...UNVISITED_SIZES[1]], [...UNVISITED_SIZES[2]]);

/** Maps the back office forces every station dot onto, at every zoom: their tiles must hold them (`EveryStationTiles.url`). */
const forcedDots = new WeakSet<MapLibreMap>();

/** Whether the dots show from `DOTS_MIN_ZOOM` only: on a dense map, unless forced at every zoom. */
const thinDots = (map: MapLibreMap) => isDense(map) && !forcedDots.has(map);

/** Opacity of the dots of the visited stations: fading in from their zoom on a dense map. */
const dotsOpacity = (map: MapLibreMap) => (thinDots(map) ? fadeIn(dotsMinZoom(map), 1) : 1);

/** Opacity of the grey dots: fading in from where the backend serves them, like every layer of the map. */
const unvisitedOpacity = (map: MapLibreMap): ExpressionSpecification | number =>
  thinDots(map) || !everyStation.has(map)
    ? ["interpolate", ["linear"], ["zoom"], dotsMinZoom(map), 0, dotsMinZoom(map) + FADE_ZOOMS, 0.8, 10, 0.9, 14, 0.95]
    : ["interpolate", ["linear"], ["zoom"], 10, 0.8, 14, 0.95];
const unvisitedStrokeOpacity = (map: MapLibreMap) => (thinDots(map) || !everyStation.has(map) ? fadeIn(dotsMinZoom(map), 1) : 1);
const unvisitedMinZoom = (map: MapLibreMap) => (thinDots(map) || !everyStation.has(map) ? dotsMinZoom(map) : 0);

/** How the dots of each map were drawn when its layers were last set: thinned out, discreet. */
const dense = new WeakMap<MapLibreMap, string>();
const densityKey = (map: MapLibreMap) => `${thinDots(map)}.${discreetDots.has(map)}`;

/** Sets the layers for the density of the map, once it changes with the visited stations, what is forced or the discreet dots. */
function applyDensity(map: MapLibreMap): void {
  const now = densityKey(map);
  if (dense.get(map) === now || !map.getLayer(LAYERS.visited)) return;
  dense.set(map, now);
  map.setLayerZoomRange(LAYERS.visited, thinDots(map) ? dotsMinZoom(map) : 0, 24);
  const sizes = visitedSizes(map);
  map.setPaintProperty(LAYERS.visited, "circle-radius", sizes["circle-radius"]);
  map.setPaintProperty(LAYERS.visited, "circle-stroke-width", sizes["circle-stroke-width"]);
  map.setPaintProperty(LAYERS.visited, "circle-opacity", dotsOpacity(map));
  map.setPaintProperty(LAYERS.visited, "circle-stroke-opacity", dotsOpacity(map));
  if (map.getLayer(LAYERS.unvisited)) {
    map.setLayerZoomRange(LAYERS.unvisited, unvisitedMinZoom(map), 24);
    map.setPaintProperty(LAYERS.unvisited, "circle-opacity", unvisitedOpacity(map));
    map.setPaintProperty(LAYERS.unvisited, "circle-stroke-opacity", unvisitedStrokeOpacity(map));
    const grey = unvisitedSizes(map);
    map.setPaintProperty(LAYERS.unvisited, "circle-radius", grey["circle-radius"]);
    map.setPaintProperty(LAYERS.unvisited, "circle-stroke-width", grey["circle-stroke-width"]);
  }
}

/** Draws the dots from a zoom sooner, discreet over their first zooms; kept as the layers are added again. */
export function setDiscreetDots(map: MapLibreMap, discreet: boolean): void {
  if (discreet) discreetDots.add(map);
  else discreetDots.delete(map);
  applyDensity(map);
}

/** Forces every station dot at every zoom on a dense map; the tiles must hold them. */
export function forceEveryDot(map: MapLibreMap, forced: boolean): void {
  if (forced) forcedDots.add(map);
  else forcedDots.delete(map);
  applyDensity(map);
}

/** Groups of layers the back office shows or hides, to audit one part of the map. */
export const LAYER_GROUPS = {
  rails: [LAYERS.linksCasing, LAYERS.ties, LAYERS.links],
  stations: [LAYERS.visited, LAYERS.names],
  hidden: [LAYERS.unvisited, LAYERS.unvisitedNames],
  zones: [
    LAYERS.zones,
    LAYERS.zoneOutlines,
    LAYERS.zoneHatch,
    LAYERS.zoneShadow,
    LAYERS.zoneSelected,
    LAYERS.footprints,
    LAYERS.footprintOutlines,
    LAYERS.footprintShadow,
    LAYERS.footprintSelected,
  ],
} as const;
export type LayerGroup = keyof typeof LAYER_GROUPS;

/** Groups hidden on each map: kept as its layers are added again. */
const hiddenGroups = new WeakMap<MapLibreMap, ReadonlySet<LayerGroup>>();

/** Hides the layers of the groups of `hidden`, shows the others; kept for the layers added later. */
export function setHiddenGroups(map: MapLibreMap, hidden: ReadonlySet<LayerGroup>): void {
  hiddenGroups.set(map, hidden);
  applyHiddenGroups(map);
}

function applyHiddenGroups(map: MapLibreMap): void {
  const hidden = hiddenGroups.get(map);
  if (!hidden) return;
  for (const [group, ids] of Object.entries(LAYER_GROUPS) as [LayerGroup, readonly string[]][]) {
    for (const id of ids) if (map.getLayer(id)) map.setLayoutProperty(id, "visibility", visibility(!hidden.has(group)));
  }
  refreshRailTies(map);
}

/** Whether a feature of the tiles of every station was hidden by the team. */
const HIDDEN: ExpressionSpecification = ["boolean", ["get", "hidden"], false];

/** The visited stations with a name, but the one shown: its bubble is drawn over the map. */
function namedFilter(map: MapLibreMap): ExpressionSpecification {
  if (everyStation.has(map)) return ["all", NAMED, ["!", HIDDEN], ["!=", ["id"], selectedIds.get(map) ?? -1]];
  return ["all", NAMED, ["!=", ["get", "id"], selectedIds.get(map) ?? -1]];
}

/** Ids of the visited stations of each map: the grey names leave them out. */
const visitedIds = new WeakMap<MapLibreMap, number[]>();

/** `visited` for the features of the visited stations, by id, else `unvisited`; when every station is, the hidden ones are not. */
function byVisit<T extends string | number>(map: MapLibreMap, visited: T, unvisited: T): ExpressionSpecification {
  if (everyStation.has(map)) return ["case", HIDDEN, unvisited, visited];
  return ["case", ["in", ["id"], ["literal", visitedIds.get(map) ?? []]], visited, unvisited];
}

/** Whether the station `id` is drawn as visited. */
function isVisited(map: MapLibreMap, id: number): boolean {
  if (!everyStation.has(map)) return (visitedIds.get(map) ?? []).includes(id);
  const [feature] = map.getSource(SOURCES.all)
    ? map.querySourceFeatures(SOURCES.all, { sourceLayer: ALL_SOURCE_LAYER, filter: ["==", ["id"], id] })
    : [];
  return feature?.properties.hidden !== true;
}

/**
 * The source of the visited stations (`stations`) or of the railway
 * between them (`rails`): the GeoJSON of the visits, or the tiles of every
 * station, the hidden ones left out.
 */
function visitedSource(map: MapLibreMap, kind: "stations" | "rails") {
  if (!everyStation.has(map)) return { source: kind === "stations" ? SOURCES.visited : SOURCES.ties };
  return {
    source: SOURCES.all,
    "source-layer": kind === "stations" ? ALL_SOURCE_LAYER : RAILS_SOURCE_LAYER,
    ...(kind === "stations" && { filter: ["!", HIDDEN] as ExpressionSpecification }),
  };
}

/** The stripes of the zone shown by visit, wider by steps as it grows zoomed in. */
function hatchPattern(map: MapLibreMap): ExpressionSpecification {
  const [first, ...next] = HATCH_LEVELS.map((_, i) =>
    byVisit(map, STATION_ICONS.hatch + i, STATION_ICONS.hatchUnvisited + i),
  );
  return ["step", ["zoom"], first, ...next.flatMap((pattern, i) => [HATCH_LEVELS[i + 1].fromZoom, pattern])];
}

function footprintColors(map: MapLibreMap, palette: MapPalette) {
  return {
    fill: byVisit(map, palette.station, palette.stationUnvisited),
    line: byVisit(map, palette.station, palette.stationUnvisited),
    hatch: hatchPattern(map),
  };
}

/** Palette of each map, for the colors of the footprints when the visited stations change. */
const palettes = new WeakMap<MapLibreMap, MapPalette>();

/** Id of the station shown on each map: its footprint and zone are less transparent. */
const selectedIds = new WeakMap<MapLibreMap, number | null>();
/** Id of the station under the pointer on each map: its footprint is outlined. */
const hoveredIds = new WeakMap<MapLibreMap, number | null>();

/** Only the footprint of the station `id`, or none. */
function footprintFilter(id: number | null | undefined): ExpressionSpecification {
  return ["==", ["id"], id ?? -1];
}

/** Opacity of the footprints and the zone tiles, of the stations visited or not, then of those of the station shown: the grey ones stronger to be seen. */
const FOOTPRINT_OPACITY = { visited: 0.3, unvisited: 0.4, selected: 0.5 } as const;
const ZONE_OPACITY = { visited: 0.1, unvisited: 0.16, selected: 0.22 } as const;
/** The white outlines of the station shown, over a drop shadow, in both themes. */
const SELECTED_LINE = "#ffffff";
const SELECTED_SHADOW = { color: "#000000", opacity: 0.45, width: 6, blur: 5, translate: [0, 2] as [number, number] } as const;

/** Fading in from their zoom like `fadeIn`, to `selected` for the station shown or under the pointer, else by visit. */
function selectedOpacity(
  map: MapLibreMap,
  { visited, unvisited, selected }: { visited: number; unvisited: number; selected: number },
): ExpressionSpecification {
  return [
    "interpolate",
    ["linear"],
    ["zoom"],
    FOOTPRINTS_MIN_ZOOM,
    0,
    FOOTPRINTS_MIN_ZOOM + FADE_ZOOMS,
    [
      "case",
      ["in", ["id"], ["literal", [selectedIds.get(map) ?? -1, hoveredIds.get(map) ?? -1]]],
      selected,
      byVisit(map, visited, unvisited),
    ],
  ];
}

function unvisitedFilter(map: MapLibreMap): ExpressionSpecification {
  if (everyStation.has(map)) return ["all", NAMED, ["!=", ["id"], selectedIds.get(map) ?? -1], HIDDEN];
  return [
    "all",
    NAMED,
    ["!=", ["id"], selectedIds.get(map) ?? -1],
    ["!", ["in", ["id"], ["literal", visitedIds.get(map) ?? []]]],
  ];
}

function rememberVisited(map: MapLibreMap, data: StationData): void {
  visitedIds.set(
    map,
    data.stations.features.map((feature) => feature.properties.id),
  );
}

/** Color of a station or a link: the pink of the gains when gained in the period of the history. */
function gainedColor(
  color: string,
  palette: MapPalette,
): ExpressionSpecification {
  return [
    "case",
    ["boolean", ["get", "gained"], false],
    palette.activityTrack,
    color,
  ];
}

/** The version is part of the URL: the browser caches the stations of each import. */
function allStationsUrl(version: string): string {
  // Absolute: MapLibre fetches the tiles from its worker.
  return `${window.location.origin}/api/stations/vector/{z}/{x}/{y}?v=${version}`;
}

function ringData(
  station: StationPick | null,
): FeatureCollection<Point, { id: number; name: string | null }> {
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
  rememberVisited(map, data);
  palettes.set(map, palette);
  selectedIds.set(map, selected?.id ?? null);
  const top = map.getLayer(SECTOR_VEIL_LAYER_ID)
    ? SECTOR_VEIL_LAYER_ID
    : undefined;
  const layout = { visibility: visibility(visible) } as const;
  map.addLayer(
    {
      id: DIM_LAYER_ID,
      type: "background",
      layout: { visibility: visibility(dimmed) },
      paint: {
        "background-color": palette.base.land,
        "background-opacity": DIM_OPACITY,
      },
    },
    belowLabels,
  );
  // The links only feed the trains: the railway is drawn from the ties, one geometry for the line, its bed and its ticks.
  map.addSource(SOURCES.links, { type: "geojson", data: data.links });
  // Tiles no finer than zoom 14, to the half meter: enough for the line, the ticks are laid out from the whole geometry.
  map.addSource(SOURCES.ties, { type: "geojson", data: data.ties, maxzoom: TIES_TILE_MAX_ZOOM });
  map.addSource(SOURCES.visited, { type: "geojson", data: data.stations });
  const every = everyStation.get(map);
  if (every && !map.getSource(SOURCES.all)) {
    map.addSource(SOURCES.all, { type: "vector", tiles: [every.url(every.version)], minzoom: every.minzoom, maxzoom: ALL_MAX_ZOOM });
  }
  map.addSource(SOURCES.selected, {
    type: "geojson",
    data: ringData(selected),
  });
  map.addSource(SOURCES.hovered, { type: "geojson", data: ringData(hovered) });
  // Larger tiles than by default: zoomed far in, a vehicle whose anchor lies off screen is still drawn.
  map.addSource(SOURCES.trains, {
    type: "geojson",
    data: EMPTY_POINTS,
    maxzoom: TRAINS_TILE_MAX_ZOOM,
  });
  addStationIcons(map, palette);
  map.addLayer(
    {
      id: LAYERS.linksCasing,
      type: "line",
      ...visitedSource(map, "rails"),
      layout: { ...layout, "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": palette.stationCasing,
        "line-width": realScale([
          [ALL_MIN_ZOOM, 2.5],
          [10, 3.6],
          [TIES_MIN_ZOOM, TRACK.line + 2 * LINE_BORDER],
        ]),
      },
    },
    belowLabels,
  );
  // The ticks across the line, bordered like it, below it.
  addRailTies(
    map,
    data.ties,
    gainedColor(palette.railLink, palette),
    palette.stationCasing,
    visibility(visible),
    belowLabels,
    every && { source: SOURCES.all, "source-layer": TICKS_SOURCE_LAYER },
  );
  // One line at every zoom, ticked from `TIES_MIN_ZOOM`.
  map.addLayer(
    {
      id: LAYERS.links,
      type: "line",
      ...visitedSource(map, "rails"),
      layout: { ...layout, "line-join": "round", "line-cap": "round" },
      paint: {
        "line-color": gainedColor(palette.railLink, palette),
        "line-width": realScale([
          [ALL_MIN_ZOOM, 1.2],
          [10, 2],
          [TIES_MIN_ZOOM, TRACK.line],
        ]),
      },
    },
    belowLabels,
  );
  map.addLayer(
    {
      id: LAYERS.visited,
      type: "circle",
      ...visitedSource(map, "stations"),
      minzoom: thinDots(map) ? dotsMinZoom(map) : 0,
      layout,
      paint: {
        "circle-color": palette.stationCasing,
        "circle-opacity": dotsOpacity(map),
        "circle-stroke-color": gainedColor(palette.station, palette),
        "circle-stroke-opacity": dotsOpacity(map),
        ...visitedSizes(map),
      },
    },
    top,
  );
  // Below the stations: a train stops under their dot.
  map.addLayer(
    {
      id: LAYERS.trains,
      type: "symbol",
      source: SOURCES.trains,
      minzoom: TRAINS_MIN_ZOOM,
      layout: {
        ...layout,
        "icon-image": ["get", "image"],
        "icon-size": TRAIN_SIZE,
        "icon-rotate": ["get", "bearing"],
        "icon-offset": ["get", "offset"],
        "icon-rotation-alignment": "map",
        "icon-allow-overlap": true,
        "icon-ignore-placement": true,
      },
    },
    LAYERS.visited,
  );
  // Names collide with each other and push the place names of the base map aside.
  map.addLayer(
    {
      id: LAYERS.names,
      type: "symbol",
      ...visitedSource(map, "stations"),
      minzoom: NAMES_MIN_ZOOM,
      filter: namedFilter(map),
      layout: { ...layout, ...nameLayout(STATION_ICONS.bubble, [1.45, 1.65]) },
      paint: {
        "text-color": palette.stationCasing,
        "text-opacity": NAMES_IN,
        "icon-opacity": NAMES_IN,
      },
    },
    top,
  );
  // Below the names: the bubble of a station stays readable over its halo.
  for (const [id, source, halo] of [
    [LAYERS.hovered, SOURCES.hovered, HALOS.hovered],
    [LAYERS.selected, SOURCES.selected, HALOS.selected],
    [LAYERS.pulse, SOURCES.selected, { ...HALOS.selected, fill: 0, edge: 0, edgeWidth: 0 }],
  ] as const) {
    map.addLayer(
      {
        id,
        type: "circle",
        source,
        layout,
        paint: {
          // The station shown in white like its outlines, in both themes.
          "circle-color": id === LAYERS.hovered ? palette.highlight : SELECTED_LINE,
          "circle-opacity": halo.fill,
          "circle-radius": halo.radius,
          "circle-stroke-color": id === LAYERS.hovered ? palette.highlight : SELECTED_LINE,
          "circle-stroke-opacity": halo.edge,
          "circle-stroke-width": halo.edgeWidth,
        },
      },
      LAYERS.names,
    );
  }
  // The layers just added follow the density of the map.
  dense.set(map, densityKey(map));
  applyHiddenGroups(map);
  bubbles.get(map)?.destroy();
  bubbles.set(map, new StationBubble(map, () => stationOutline(map)));
  setSelectedStation(map, selected);
}

/**
 * Adds or replaces the grey stations once the version of the import is
 * known, below the visited ones. Each version gets its own source: a vector
 * source whose first tiles were empty would keep drawing nothing after
 * `setTiles`. Drawing every station (`drawEveryStation`), the source holds
 * the visited ones too: kept, under the tiles of the new version.
 */
export function setAllStations(
  map: MapLibreMap,
  version: string | null,
  palette: MapPalette,
  visible: boolean,
): void {
  if (!map.getLayer(LAYERS.visited)) return;
  palettes.set(map, palette);
  const every = everyStation.get(map);
  if (every) {
    // The visited stations are drawn from the same source: kept, its tiles fetched again under the new version.
    if (version && version !== every.version) {
      every.version = version;
      map.getSource<VectorTileSource>(SOURCES.all)?.setTiles([every.url(version)]);
    }
    if (map.getLayer(LAYERS.unvisited)) return;
  }
  const url = version ? allStationsUrl(version) : null;
  const source = map.getSource<VectorTileSource>(SOURCES.all);
  if (!every && source && source.tiles[0] === url) return;
  for (const id of [
    LAYERS.zones,
    LAYERS.zoneOutlines,
    LAYERS.zoneHatch,
    LAYERS.footprints,
    LAYERS.footprintOutlines,
    LAYERS.zoneShadow,
    LAYERS.zoneSelected,
    LAYERS.footprintShadow,
    LAYERS.footprintSelected,
    LAYERS.unvisited,
    LAYERS.unvisitedNames,
  ]) {
    if (map.getLayer(id)) map.removeLayer(id);
  }
  if (!every) {
    if (source) map.removeSource(SOURCES.all);
    if (!url) return;
    map.addSource(SOURCES.all, {
      type: "vector",
      tiles: [url],
      minzoom: DISCREET_DOTS_MIN_ZOOM,
      maxzoom: ALL_MAX_ZOOM,
    });
  }
  // Below the railway, over the tiles: the small tiles of the zones in a light fill, each zone thinly outlined around its group.
  const colors = footprintColors(map, palette);
  const shown = { visibility: visibility(visible) } as const;
  const zones = { source: SOURCES.all, "source-layer": ZONES_SOURCE_LAYER, minzoom: FOOTPRINTS_MIN_ZOOM } as const;
  const footprints = { source: SOURCES.all, "source-layer": FOOTPRINTS_SOURCE_LAYER, minzoom: FOOTPRINTS_MIN_ZOOM } as const;
  map.addLayer(
    {
      id: LAYERS.zones,
      type: "fill",
      ...zones,
      layout: shown,
      paint: {
        "fill-color": colors.fill,
        "fill-opacity": selectedOpacity(map, ZONE_OPACITY),
        "fill-antialias": false,
      },
    },
    LAYERS.linksCasing,
  );
  map.addLayer(
    {
      id: LAYERS.zoneOutlines,
      type: "line",
      ...zones,
      layout: { ...shown, "line-join": "miter" },
      paint: { "line-color": colors.line, "line-opacity": fadeIn(FOOTPRINTS_MIN_ZOOM, 0.8), "line-width": 1.25 },
    },
    LAYERS.linksCasing,
  );
  // Wide light stripes over the small tiles of the station shown.
  map.addLayer(
    {
      id: LAYERS.zoneHatch,
      type: "fill",
      ...zones,
      filter: footprintFilter(selectedIds.get(map)),
      layout: shown,
      paint: { "fill-pattern": colors.hatch, "fill-opacity": fadeIn(FOOTPRINTS_MIN_ZOOM, 0.3) },
    },
    LAYERS.linksCasing,
  );
  // Over the railway, still below the labels like it, in this order: the outlines of the zone shown, then the footprints.
  const layers = map.getStyle().layers;
  const overLinks = layers[layers.findIndex(({ id }) => id === LAYERS.links) + 1]?.id;
  // The zone and the footprint of the station shown outlined in white over a drop shadow: the zone below the footprints, the footprint over the labels.
  const selectedId = selectedIds.get(map);
  const shadow = {
    "line-color": SELECTED_SHADOW.color,
    "line-opacity": fadeIn(FOOTPRINTS_MIN_ZOOM, SELECTED_SHADOW.opacity),
    "line-width": SELECTED_SHADOW.width,
    "line-blur": SELECTED_SHADOW.blur,
    "line-translate": SELECTED_SHADOW.translate,
  } as const;
  const white = { "line-color": SELECTED_LINE, "line-opacity": fadeIn(FOOTPRINTS_MIN_ZOOM, 1) } as const;
  for (const [id, source, join, paint, before] of [
    [LAYERS.zoneShadow, zones, "miter", shadow, overLinks],
    [LAYERS.zoneSelected, zones, "miter", { ...white, "line-width": 1.5 }, overLinks],
    [LAYERS.footprintShadow, footprints, "round", shadow, LAYERS.visited],
    [LAYERS.footprintSelected, footprints, "round", { ...white, "line-width": 2 }, LAYERS.visited],
  ] as const) {
    map.addLayer(
      { id, type: "line", ...source, filter: footprintFilter(selectedId), layout: { ...shown, "line-join": join }, paint },
      before,
    );
  }
  // The footprints outlined over a light fill.
  map.addLayer(
    {
      id: LAYERS.footprints,
      type: "fill",
      ...footprints,
      layout: shown,
      paint: { "fill-color": colors.fill, "fill-opacity": selectedOpacity(map, FOOTPRINT_OPACITY) },
    },
    overLinks,
  );
  map.addLayer(
    {
      id: LAYERS.footprintOutlines,
      type: "line",
      ...footprints,
      layout: { ...shown, "line-join": "round" },
      paint: { "line-color": colors.line, "line-opacity": fadeIn(FOOTPRINTS_MIN_ZOOM, 0.85), "line-width": 1.25 },
    },
    overLinks,
  );
  map.addLayer(
    {
      id: LAYERS.unvisited,
      type: "circle",
      source: SOURCES.all,
      "source-layer": ALL_SOURCE_LAYER,
      minzoom: unvisitedMinZoom(map),
      layout: { visibility: visibility(visible) },
      paint: {
        "circle-color": palette.stationCasing,
        "circle-opacity": unvisitedOpacity(map),
        "circle-stroke-color": palette.stationUnvisited,
        "circle-stroke-opacity": unvisitedStrokeOpacity(map),
        ...unvisitedSizes(map),
      },
    },
    LAYERS.visited,
  );
  // Below the names of the visited stations: they win the room on the map.
  map.addLayer(
    {
      id: LAYERS.unvisitedNames,
      type: "symbol",
      source: SOURCES.all,
      "source-layer": ALL_SOURCE_LAYER,
      minzoom: NAMES_MIN_ZOOM,
      filter: unvisitedFilter(map),
      layout: {
        visibility: visibility(visible),
        ...nameLayout(STATION_ICONS.bubbleUnvisited, [1.3, 1.4]),
      },
      paint: {
        "text-color": palette.stationCasing,
        "text-opacity": NAMES_IN,
        "icon-opacity": fadeIn(NAMES_MIN_ZOOM, UNVISITED_BUBBLE_OPACITY),
      },
    },
    LAYERS.names,
  );
  applyHiddenGroups(map);
}

/** Shows the visited stations and the links of `data`; ignored until the layers are added. */
export function setStationData(map: MapLibreMap, data: StationData): void {
  rememberVisited(map, data);
  applyDensity(map);
  if (map.getLayer(LAYERS.unvisitedNames))
    map.setFilter(LAYERS.unvisitedNames, unvisitedFilter(map));
  const palette = palettes.get(map);
  if (palette && map.getLayer(LAYERS.zones)) {
    const colors = footprintColors(map, palette);
    map.setPaintProperty(LAYERS.zones, "fill-color", colors.fill);
    map.setPaintProperty(LAYERS.footprints, "fill-color", colors.fill);
    map.setPaintProperty(LAYERS.footprintOutlines, "line-color", colors.line);
    map.setPaintProperty(LAYERS.zoneOutlines, "line-color", colors.line);
    map.setPaintProperty(LAYERS.zoneHatch, "fill-pattern", colors.hatch);
    map.setPaintProperty(LAYERS.zones, "fill-opacity", selectedOpacity(map, ZONE_OPACITY));
    map.setPaintProperty(LAYERS.footprints, "fill-opacity", selectedOpacity(map, FOOTPRINT_OPACITY));
  }
  map.getSource<GeoJSONSource>(SOURCES.visited)?.setData(data.stations);
  map.getSource<GeoJSONSource>(SOURCES.links)?.setData(data.links);
  map.getSource<GeoJSONSource>(SOURCES.ties)?.setData(data.ties);
  setRailTies(map, data.ties);
  // The bubble of the station shown takes the colors of its visit.
  updateBubble(map);
}

/** The DOM bubble of the station shown on each map. */
const bubbles = new WeakMap<MapLibreMap, StationBubble>();
/** The station shown and the one under the pointer, on each map. */
const selectedPicks = new WeakMap<MapLibreMap, StationPick | null>();
const hoveredPicks = new WeakMap<MapLibreMap, StationPick | null>();
/** Frame of the pulse of the station shown, on each map. */
const pulses = new WeakMap<MapLibreMap, number>();

/** The outline of the footprint of the station shown, else of its zone, as rings of coordinates: from the tiles loaded. */
function stationOutline(map: MapLibreMap): [number, number][][] {
  const id = selectedIds.get(map);
  if (id == null || !map.getSource(SOURCES.all)) return [];
  for (const sourceLayer of [FOOTPRINTS_SOURCE_LAYER, ZONES_SOURCE_LAYER]) {
    const rings = map
      .querySourceFeatures(SOURCES.all, { sourceLayer, filter: ["==", ["id"], id] })
      .flatMap(({ geometry }) =>
        geometry.type === "Polygon"
          ? geometry.coordinates
          : geometry.type === "MultiPolygon"
            ? geometry.coordinates.flat()
            : [],
      ) as [number, number][][];
    if (rings.length > 0) return rings;
  }
  return [];
}

/** The name of the station `id` among the tiles loaded, when the pick does not carry it. */
function nameOf(map: MapLibreMap, pick: StationPick): string | null {
  if (pick.name !== undefined) return pick.name;
  const visited = map.querySourceFeatures(SOURCES.visited, { filter: ["==", ["get", "id"], pick.id] })[0];
  if (visited) return visited.properties.name ?? null;
  if (!map.getSource(SOURCES.all)) return null;
  const [feature] = map.querySourceFeatures(SOURCES.all, {
    sourceLayer: ALL_SOURCE_LAYER,
    filter: ["==", ["id"], pick.id],
  });
  return (feature?.properties.name as string | undefined) ?? null;
}

/** Shows the bubble of the station shown in the colors of its visit, or none. */
function updateBubble(map: MapLibreMap): void {
  const bubble = bubbles.get(map);
  const palette = palettes.get(map);
  const station = selectedPicks.get(map);
  if (!bubble || !palette) return;
  const name = station ? nameOf(map, station) : null;
  if (!station || !name) {
    bubble.set(null);
    return;
  }
  const visited = isVisited(map, station.id);
  bubble.set({
    lon: station.lon,
    lat: station.lat,
    name,
    fill: visited ? palette.station : palette.stationUnvisited,
    text: palette.stationCasing,
    glyph: glyphUrl(palette.stationCasing),
    // Like the icons of the names layers.
    opacity: visited ? 1 : UNVISITED_BUBBLE_OPACITY,
    lift: visited ? [1.45, 1.65] : [1.3, 1.4],
  });
}

/** Radius of the halo of the station shown, `share` of its own. */
function haloRadius(share: number): ExpressionSpecification {
  return byZoom(8 * share, 11 * share, 14 * share);
}

/** Pulses the station shown, but for those who prefer less motion; stops without any. */
function pulse(map: MapLibreMap, on: boolean): void {
  cancelAnimationFrame(pulses.get(map) ?? 0);
  pulses.delete(map);
  if (!on || !map.getLayer(LAYERS.pulse) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  let last = 0;
  const tick = (now: number) => {
    // Stopped with the map or its layers.
    if (!map.style || !map.getLayer(LAYERS.pulse)) {
      pulses.delete(map);
      return;
    }
    pulses.set(map, requestAnimationFrame(tick));
    // A few frames a second are enough: each one repaints the map.
    if (now - last < PULSE.frameMs || map.getLayoutProperty(LAYERS.pulse, "visibility") === "none") return;
    last = now;
    const t = (now % PULSE.periodMs) / PULSE.periodMs;
    // Rising and falling smoothly over the period: no pulse pops in or out.
    const wave = Math.sin(Math.PI * t) ** 2;
    const halo = 1 + PULSE.swell * wave;
    map.setPaintProperty(LAYERS.selected, "circle-radius", haloRadius(halo));
    // Slowing down as it reaches the edge of the halo.
    map.setPaintProperty(LAYERS.pulse, "circle-radius", haloRadius(halo * (1 - (1 - t) ** 2)));
    map.setPaintProperty(LAYERS.pulse, "circle-opacity", PULSE.opacity * wave * (1 - t));
  };
  pulses.set(map, requestAnimationFrame(tick));
}

/** Rings the station under the pointer, unless it is the one shown: it stays as it is. */
function updateHoveredRing(map: MapLibreMap): void {
  const hovered = hoveredPicks.get(map) ?? null;
  const shown = hovered && hovered.id !== selectedIds.get(map) ? hovered : null;
  map.getSource<GeoJSONSource>(SOURCES.hovered)?.setData(ringData(shown));
}

/** Haloes and pulses the station shown in the panel, names it in its bubble, darkens its footprint and zone and outlines them in white, or none. */
export function setSelectedStation(
  map: MapLibreMap,
  station: StationPick | null,
): void {
  const changed = selectedIds.get(map) !== (station?.id ?? null);
  selectedIds.set(map, station?.id ?? null);
  selectedPicks.set(map, station);
  if (changed && map.getLayer(LAYERS.zones)) {
    map.setPaintProperty(LAYERS.zones, "fill-opacity", selectedOpacity(map, ZONE_OPACITY));
    map.setPaintProperty(LAYERS.footprints, "fill-opacity", selectedOpacity(map, FOOTPRINT_OPACITY));
    for (const id of [LAYERS.zoneHatch, LAYERS.zoneShadow, LAYERS.zoneSelected, LAYERS.footprintShadow, LAYERS.footprintSelected])
      map.setFilter(id, footprintFilter(station?.id));
    map.setFilter(LAYERS.unvisitedNames, unvisitedFilter(map));
  }
  if (changed && map.getLayer(LAYERS.names)) map.setFilter(LAYERS.names, namedFilter(map));
  map.getSource<GeoJSONSource>(SOURCES.selected)?.setData(ringData(station));
  updateHoveredRing(map);
  updateBubble(map);
  if (changed || !pulses.has(map)) pulse(map, station !== null);
}

/** Haloes the station under the pointer and darkens its footprint and zone like the one shown, without its outlines: a click opens it. */
export function setHoveredStation(
  map: MapLibreMap,
  station: StationPick | null,
): void {
  const id = station?.id ?? null;
  hoveredPicks.set(map, station);
  // Called on every move of the pointer: the filter changes with the station only.
  if (hoveredIds.get(map) !== id) {
    hoveredIds.set(map, id);
    if (map.getLayer(LAYERS.zones)) {
      map.setPaintProperty(LAYERS.zones, "fill-opacity", selectedOpacity(map, ZONE_OPACITY));
      map.setPaintProperty(LAYERS.footprints, "fill-opacity", selectedOpacity(map, FOOTPRINT_OPACITY));
    }
  }
  updateHoveredRing(map);
}

export function setStationsVisible(map: MapLibreMap, visible: boolean): void {
  for (const id of Object.values(LAYERS)) {
    if (map.getLayer(id))
      map.setLayoutProperty(id, "visibility", visibility(visible));
  }
  refreshRailTies(map);
  bubbles.get(map)?.setVisible(visible);
}

/** Dims the map below the stations, or not; ignored until the layers are added. */
export function setMapDimmed(map: MapLibreMap, dimmed: boolean): void {
  if (map.getLayer(DIM_LAYER_ID))
    map.setLayoutProperty(DIM_LAYER_ID, "visibility", visibility(dimmed));
}

/** Id of the train drawn under the pointer or a few pixels from it; null without any. */
export function trainNear(
  map: MapLibreMap,
  point: { x: number; y: number },
): number | null {
  if (
    !map.getLayer(LAYERS.trains) ||
    map.getLayoutProperty(LAYERS.trains, "visibility") === "none"
  )
    return null;
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
export function stationNear(
  map: MapLibreMap,
  point: { x: number; y: number },
): StationPick | null {
  const layers = [
    LAYERS.visited,
    LAYERS.names,
    LAYERS.unvisited,
    LAYERS.unvisitedNames,
  ].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, "visibility") !== "none");
  if (layers.length === 0) return null;
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
    const name = typeof feature.properties.name === "string" ? feature.properties.name : null;
    if (!best || distance < best.distance)
      best = { pick: { id, lon, lat, name }, distance };
  }
  return best?.pick ?? footprintAt(map, point);
}

/** The station whose footprint or zone lies under the pointer, the one drawn on top; null without any. */
function footprintAt(
  map: MapLibreMap,
  point: { x: number; y: number },
): StationPick | null {
  if (!map.getLayer(LAYERS.footprints) || map.getZoom() < FOOTPRINTS_MIN_ZOOM + FADE_ZOOMS / 2)
    return null;
  // The footprints first: drawn over the zones.
  const features = map.queryRenderedFeatures([point.x, point.y], {
    layers: [LAYERS.footprints, LAYERS.zones],
  });
  for (const feature of features) {
    const id = Number(feature.id);
    const { lon, lat } = feature.properties;
    if (Number.isSafeInteger(id) && typeof lon === "number" && typeof lat === "number")
      return { id, lon, lat };
  }
  return null;
}
