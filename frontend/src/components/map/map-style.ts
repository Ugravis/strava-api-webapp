import type { ExpressionSpecification, LayerSpecification, Map as MapLibreMap, StyleSpecification } from "maplibre-gl";

/**
 * OpenFreeMap vector style: OpenStreetMap data, no API key nor quota. The
 * same style serves both themes, recolored by `recolorStyle`: its layers
 * are richer than those of the dark style.
 */
export const BASE_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
/** Vector source of the base style. */
const BASE_SOURCE = "openmaptiles";

/**
 * First layer of the base map over its bare land. The visited countries and
 * tiles go below it, as the ground of the map: vegetation, water,
 * buildings, roads and names stay visible over them.
 */
export function firstGroundLayerId(map: MapLibreMap): string | undefined {
  // A layer of the base map itself: the countries and tiles, once added, sit
  // below it too, in the order the callers choose.
  return map.getStyle().layers.find((layer) => "source" in layer && layer.source === BASE_SOURCE)?.id;
}

/** Metropolitan France, shown until there is a track to frame. */
export const DEFAULT_VIEW = { center: [2.5, 46.6] as [number, number], zoom: 4.5 };

/** Colors of the base map, by kind of feature. */
interface BasePalette {
  land: string;
  /** Vegetation and land use: translucent veils over the ground, the tiles show through. */
  residential: string;
  park: string;
  wood: string;
  ice: string;
  water: string;
  waterway: string;
  building: string;
  buildingOutline: string;
  road: string;
  minorRoad: string;
  path: string;
  /** Casings of the roads, hidden: the roads are flat. */
  casing: string;
  rail: string;
  boundary: string;
  label: string;
  /** Road and airport names, smaller and secondary. */
  mutedLabel: string;
  waterLabel: string;
}

/**
 * Colors of a theme. A warm beige land, desaturated outside the visited
 * countries, grey roads and a blue water carry the map: the explored tiles
 * in green, the largest squares in pink, the tracks in raspberry. Text and
 * lines reach a contrast of 4.5:1 and 3:1 with the land (WCAG 1.4.3 and
 * 1.4.11). The dark theme mirrors the light one: its quiet levels are dark,
 * its prominent ones light.
 */
export interface MapPalette {
  base: BasePalette;
  tile: string;
  tileOpacity: number;
  /**
   * Largest cluster of large tiles, opaque: pale in light, dark in dark, the
   * same at every zoom. Zoomed in, every large tile takes its color.
   */
  cluster: string;
  /** Other clusters of large tiles: a lighter wash of the same color, short of the largest. */
  otherClusters: string;
  otherClustersOpacity: number;
  /** Small tiles, deeper than the large ones they are drawn over: the two levels stand apart. */
  subtile: string;
  subtileOpacity: number;
  /** Largest cluster of small tiles, the most prominent level. */
  subtileCluster: string;
  subtileClusterOpacity: number;
  /**
   * Other clusters of small tiles: a little deeper and denser than the small
   * tiles. Opaque zoomed out, a much deeper color merges into the largest cluster.
   */
  otherSubtileClusters: string;
  otherSubtileClustersOpacity: number;
  /** Outline of the visited area: carries the contrast of the light fills. */
  tileOutline: string;
  square: string;
  /** Outline of the tile under the pointer or selected: the color of the text, softened. */
  highlight: string;
  /**
   * Tiles of the activity shown in the panel, opaque: they replace the
   * other tiles where they lie, deeper on its small tiles.
   */
  activityTile: string;
  activitySubtile: string;
  /** Track of the activity shown in the panel, over a white casing. */
  activityTrack: string;
  activityTrackCasing: string;
  grid: string;
  track: string;
  /** Faint edge of the tracks: their contrast over the land and the small tiles. */
  trackCasing: string;
  /** Visited countries: the land in its full color, the others desaturated; a neutral border. */
  country: string;
  countryOpacity: number;
  countryBorder: string;
  /** Train stations visited and the railway between them, in violet, apart from the tiles and tracks. */
  station: string;
  /** Ring of the stations and casing of the railway: their contrast over the tiles and tracks. */
  stationCasing: string;
  /** Stations not visited yet: a quiet grey. */
  stationUnvisited: string;
  railLink: string;
  /** Veil over the map outside the sector picked: its colors fade towards it. */
  outside: string;
  outsideOpacity: number;
  sectorBorder: string;
}

const LIGHT: MapPalette = {
  base: {
    land: "#e4e0da",
    residential: "rgba(0, 0, 0, 0.03)",
    park: "rgba(21, 128, 61, 0.07)",
    wood: "rgba(21, 128, 61, 0.1)",
    ice: "rgba(255, 255, 255, 0.6)",
    water: "#4d77b2",
    waterway: "#4d77b2",
    building: "#aeb3b0",
    buildingOutline: "#979c99",
    road: "#7d8380",
    minorRoad: "#8c918e",
    path: "#9ca09e",
    casing: "#7d8380",
    rail: "#7d8380",
    boundary: "#5b4a35",
    label: "#2a1f12",
    mutedLabel: "#5b4a35",
    waterLabel: "#ffffff",
  },
  tile: "#16a34a",
  tileOpacity: 0.4,
  cluster: "#f4fbf6",
  otherClusters: "#f4fbf6",
  otherClustersOpacity: 0.2,
  subtile: "#15803d",
  subtileOpacity: 0.5,
  subtileCluster: "#052e16",
  subtileClusterOpacity: 0.75,
  otherSubtileClusters: "#166534",
  otherSubtileClustersOpacity: 0.75,
  tileOutline: "#14532d",
  square: "#db2777",
  highlight: "#1c1917",
  activityTile: "#f472b6",
  activitySubtile: "#9d174d",
  activityTrack: "#be185d",
  activityTrackCasing: "#ffffff",
  grid: "#5b4a35",
  track: "#be185d",
  trackCasing: "#4a0d2e",
  country: "#e8d4ae",
  countryOpacity: 0.85,
  countryBorder: "#a8906a",
  station: "#6d28d9",
  stationCasing: "#ffffff",
  stationUnvisited: "#8c8780",
  railLink: "#6d28d9",
  outside: "#f3f2f0",
  outsideOpacity: 0.65,
  sectorBorder: "#2a1f12",
};

const DARK: MapPalette = {
  base: {
    land: "#1f1e1c",
    residential: "rgba(255, 255, 255, 0.02)",
    park: "rgba(74, 222, 128, 0.05)",
    wood: "rgba(74, 222, 128, 0.08)",
    ice: "rgba(255, 255, 255, 0.08)",
    water: "#132a45",
    waterway: "#1d3a5f",
    building: "#3a3d3b",
    buildingOutline: "#444846",
    road: "#5b605d",
    minorRoad: "#4d524f",
    path: "#444846",
    casing: "#5b605d",
    rail: "#5b605d",
    boundary: "#a1968a",
    label: "#ece6dc",
    mutedLabel: "#b5ab9c",
    waterLabel: "#d6e6ff",
  },
  tile: "#22c55e",
  tileOpacity: 0.35,
  // Dark: the quiet levels are dark, the prominent ones light.
  cluster: "#0f1f17",
  otherClusters: "#0f1f17",
  otherClustersOpacity: 0.25,
  tileOutline: "#4ade80",
  subtile: "#4ade80",
  subtileOpacity: 0.5,
  subtileCluster: "#bbf7d0",
  subtileClusterOpacity: 0.75,
  otherSubtileClusters: "#68e796",
  otherSubtileClustersOpacity: 0.75,
  square: "#f472b6",
  highlight: "#fafaf9",
  activityTile: "#9d174d",
  activitySubtile: "#f9a8d4",
  activityTrack: "#ec4899",
  activityTrackCasing: "#ffffff",
  grid: "#a8a29e",
  track: "#fb7185",
  trackCasing: "#1a0f14",
  country: "#3b3226",
  countryOpacity: 0.85,
  countryBorder: "#6f6658",
  station: "#a78bfa",
  stationCasing: "#1f1e1c",
  stationUnvisited: "#7a756d",
  railLink: "#a78bfa",
  outside: "#121211",
  outsideOpacity: 0.65,
  sectorBorder: "#ece6dc",
};

/** Both palettes, for the keys drawn by the page in CSS, whatever the theme resolved. */
export const MAP_PALETTES = { light: LIGHT, dark: DARK } as const;

export function mapPalette(theme: string | undefined): MapPalette {
  return theme === "dark" ? DARK : LIGHT;
}

type Paint = Record<string, unknown>;

/**
 * Zooms over which every layer of the map fades in after its minimum zoom,
 * or out before its maximum one: no feature pops in or out with the zoom.
 * The tracks alone fade in over a longer range.
 */
export const FADE_ZOOMS = 1;

/** Opacity rising from 0 at `minZoom` to `opacity` `zooms` later: the layer appears smoothly. */
export function fadeIn(minZoom: number, opacity: number, zooms = FADE_ZOOMS): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], minZoom, 0, minZoom + zooms, opacity];
}

/**
 * The rivers and streams fade in once zoomed in on a region; the buildings
 * from zoom 13, where the base map starts serving them.
 */
const WATERWAY_MIN_ZOOM = 8;
const BUILDING_MIN_ZOOM = 13;

/** The wide rivers are areas of water: they fade in with the waterways, the seas and lakes stay. */
function riverOpacity(): ExpressionSpecification {
  const isRiver: ExpressionSpecification = ["match", ["get", "class"], "river", 0, 1];
  return ["interpolate", ["linear"], ["zoom"], WATERWAY_MIN_ZOOM, isRiver, WATERWAY_MIN_ZOOM + FADE_ZOOMS, 1];
}

/** New colors of a layer of the base style, from its kind of feature; null to keep it. */
function basePaint(layer: LayerSpecification, base: BasePalette): Paint | null {
  const sourceLayer = "source-layer" in layer ? layer["source-layer"] : undefined;
  const { id } = layer;
  switch (layer.type) {
    case "background":
      return { "background-color": base.land };
    case "fill":
      switch (sourceLayer) {
        case "water":
          return { "fill-color": base.water, "fill-opacity": riverOpacity() };
        case "park":
          return { "fill-color": base.park };
        case "landcover":
          return { "fill-color": id.includes("wood") ? base.wood : base.ice };
        case "landuse":
          return { "fill-color": base.residential };
        case "building":
          return {
            "fill-color": base.building,
            "fill-outline-color": base.buildingOutline,
            "fill-opacity": fadeIn(BUILDING_MIN_ZOOM, 1),
          };
        case "aeroway":
          return { "fill-color": base.road };
        case "transportation":
          return { "fill-color": base.land };
        default:
          return null;
      }
    case "line":
      switch (sourceLayer) {
        case "waterway":
          return { "line-color": base.waterway, "line-opacity": fadeIn(WATERWAY_MIN_ZOOM, 1) };
        case "boundary":
          return { "line-color": base.boundary };
        case "aeroway":
        case "transportation":
          return { "line-color": roadColor(id, base) };
        default:
          return null;
      }
    case "symbol": {
      // Shields carry their text on an image: they keep their colors.
      if (!layer.paint || !("text-color" in layer.paint)) return null;
      // The names of the water are drawn on it: their halo is the water.
      if (sourceLayer === "water_name" || sourceLayer === "waterway") {
        return { "text-color": base.waterLabel, "text-halo-color": base.water };
      }
      const muted = sourceLayer === "transportation_name" || sourceLayer === "aerodrome_label";
      return { "text-color": muted ? base.mutedLabel : base.label, "text-halo-color": base.land };
    }
    default:
      return null;
  }
}

/**
 * Zoom from which each kind of road appears, later than in the base style:
 * zoomed out, the network would cover the land and the tiles. The base
 * style draws simplified major roads up to zoom 11 and motorways up to 6.
 */
function roadMinZoom(id: string): number {
  if (id.includes("motorway")) return 6;
  if (id.includes("major")) return 9;
  if (id.includes("path") || id.includes("pier")) return 15;
  if (id.includes("minor") || id.includes("railway") || id.includes("taxiway")) return 12;
  return 0;
}

/**
 * The main railways appear earlier than in the base style, which draws them
 * from zoom 13: a thin line once zoomed in on a region, their hatching from
 * zoom 13. The base map serves them from zoom 8.
 */
const RAILWAY_MIN_ZOOM = 11;
const RAILWAY_LAYER_ID = "railway";
const RAILWAY_DASHLINE_LAYER_ID = "railway_dashline";
/** Widths of the railway and of its hatching, thin while zoomed out; the base style keeps them wide below zoom 16. */
const RAILWAY_WIDTHS: Record<string, ExpressionSpecification> = {
  [RAILWAY_LAYER_ID]: ["interpolate", ["exponential", 1.3], ["zoom"], RAILWAY_MIN_ZOOM, 1, 16, 3, 20, 7],
  [RAILWAY_DASHLINE_LAYER_ID]: ["interpolate", ["exponential", 1.3], ["zoom"], RAILWAY_MIN_ZOOM, 0.6, 16, 2, 20, 6],
};

/**
 * Zoom from which each class of road of the base map appears. The data of a
 * class arrives at its own zoom, sometimes within a layer already drawn
 * (the tertiary roads at zoom 11, the service roads at 13): each class fades
 * in from it, never later than the layer itself.
 */
const ROAD_CLASS_ZOOMS: Record<string, number> = {
  motorway: 6,
  trunk: 9,
  primary: 9,
  secondary: 9,
  tertiary: 11,
  busway: 11,
  minor: 12,
  track: 12,
  raceway: 12,
  service: 13,
  path: 15,
  pier: 15,
  bridge: 15,
  rail: RAILWAY_MIN_ZOOM,
  transit: 16,
  runway: 11,
  taxiway: 12,
};
/** Zoom of the last stop of the fades: every road is opaque by then. */
const ROAD_FADE_END_ZOOM = 17;

/** Opacity of a layer `FADE_ZOOMS` long fade starting at `from`: 0 before, 1 after. */
const ramp = (zoom: number, from: number) => Math.min(1, Math.max(0, (zoom - from) / FADE_ZOOMS));

/**
 * Opacity of a road layer: each class fades in over the zoom after it
 * appears. A layer continuing a simplified one of the same kind (the base
 * style draws the major roads simplified up to zoom 11, then detailed) does
 * not fade in again as a whole.
 */
function roadOpacity(layerMinZoom: number, continues: boolean): ExpressionSpecification | number {
  if (layerMinZoom >= ROAD_FADE_END_ZOOM) return 1;
  const layerRamp = (zoom: number) => (continues ? 1 : ramp(zoom, layerMinZoom));
  const stops: (number | ExpressionSpecification)[] = [];
  for (let zoom = Math.floor(layerMinZoom); zoom <= ROAD_FADE_END_ZOOM; zoom++) {
    const cases = Object.entries(ROAD_CLASS_ZOOMS).flatMap(([roadClass, from]) => {
      const opacity = Math.min(ramp(zoom, from), layerRamp(zoom));
      return [[roadClass, `${roadClass}_construction`], opacity];
    });
    // Built from the table: its pairs are not known to the types of MapLibre.
    stops.push(zoom, ["match", ["get", "class"], ...cases, layerRamp(zoom)] as unknown as ExpressionSpecification);
  }
  return ["interpolate", ["linear"], ["zoom"], ...stops] as ExpressionSpecification;
}

function roadColor(id: string, base: BasePalette): string {
  if (id.includes("casing")) return base.casing;
  // The roads drawn zoomed out, a dense network: as light as the minor roads.
  if (id.includes("subtle")) return base.minorRoad;
  // The dashes of the railways are gaps in the land color.
  if (id.includes("dashline")) return base.land;
  if (id.includes("railway")) return base.rail;
  if (id.includes("path") || id.includes("pier")) return base.path;
  if (id.includes("minor") || id.includes("taxiway")) return base.minorRoad;
  return base.road;
}

/** The roads of the base style, which appear later than it plans. */
function isRoad(layer: LayerSpecification): boolean {
  return (
    layer.type === "line" &&
    "source-layer" in layer &&
    (layer["source-layer"] === "transportation" || layer["source-layer"] === "aeroway")
  );
}

/** A road of the base style appearing at its own zoom, without casing. */
function adjustRoad(layer: LayerSpecification): LayerSpecification {
  const earlier = layer.id === RAILWAY_LAYER_ID;
  const appearZoom = earlier ? RAILWAY_MIN_ZOOM : roadMinZoom(layer.id);
  const minzoom = earlier ? appearZoom : Math.max(layer.minzoom ?? 0, appearZoom);
  const continues = !earlier && appearZoom > 0 && (layer.minzoom ?? 0) > appearZoom;
  // Flat roads: the casings are hidden.
  const layout = layer.id.includes("casing") ? { ...layer.layout, visibility: "none" } : layer.layout;
  const width = RAILWAY_WIDTHS[layer.id];
  return {
    ...layer,
    minzoom,
    layout,
    paint: {
      ...layer.paint,
      ...(width ? { "line-width": width } : {}),
      "line-opacity": roadOpacity(minzoom, continues),
    },
  } as LayerSpecification;
}

/** Layer of the base style drawing the boundaries of the subdivisions, replaced by `SUBDIVISIONS`. */
const SUBDIVISION_LAYER_ID = "boundary_3";

/**
 * Boundaries of the subdivisions of every country, more visible than in the
 * base style. The first level (regions, states, `admin_level` 3 and 4)
 * appears once the whole country is on screen; the second (departments,
 * counties, 5 and 6) as soon as the base map serves it, from zoom 9.
 */
const SUBDIVISIONS = [
  {
    id: "boundary_subdivision_1",
    levels: [3, 4],
    minzoom: 4,
    opacity: 0.9,
    width: [4, 1.1, 8, 1.8, 12, 2.6],
    dasharray: [4, 2],
  },
  {
    id: "boundary_subdivision_2",
    levels: [5, 6],
    minzoom: 9,
    opacity: 0.85,
    width: [9, 1.2, 12, 1.8],
    dasharray: [3, 2],
  },
] as const;

/** The boundaries of the subdivisions, one layer per level, in the place of `layer`. */
function subdivisionLayers(layer: LayerSpecification, base: BasePalette): LayerSpecification[] {
  if (layer.type !== "line") return [layer];
  return SUBDIVISIONS.map(({ id, levels: [low, high], minzoom, opacity, width, dasharray }) => ({
    ...layer,
    id,
    minzoom,
    filter: [
      "all",
      [">=", ["get", "admin_level"], low],
      ["<=", ["get", "admin_level"], high],
      ["!=", ["get", "maritime"], 1],
      ["!=", ["get", "disputed"], 1],
      ["!", ["has", "claimed_by"]],
    ],
    paint: {
      "line-color": base.boundary,
      "line-opacity": opacity,
      "line-dasharray": [...dasharray],
      "line-width": ["interpolate", ["linear"], ["zoom"], ...width],
    },
  }));
}

type Stop = [zoom: number, value: number];

/**
 * Stops of an opacity of the base style: a constant, or a numeric
 * interpolation on the zoom, its curve taken as linear; null for any other.
 */
function opacityStops(value: unknown): Stop[] | null {
  if (value === undefined) return [[0, 1]];
  if (typeof value === "number") return [[0, value]];
  if (!Array.isArray(value) || value[0] !== "interpolate" || !Array.isArray(value[2]) || value[2][0] !== "zoom") {
    return null;
  }
  const stops: Stop[] = [];
  for (let i = 3; i + 1 < value.length; i += 2) {
    const [zoom, opacity] = [value[i], value[i + 1]];
    if (typeof zoom !== "number" || typeof opacity !== "number") return null;
    stops.push([zoom, opacity]);
  }
  return stops;
}

function valueAt(stops: Stop[], zoom: number): number {
  const next = stops.findIndex(([stop]) => stop >= zoom);
  if (next === 0) return stops[0][1];
  if (next === -1) return stops[stops.length - 1][1];
  const [[z0, v0], [z1, v1]] = [stops[next - 1], stops[next]];
  return v0 + ((v1 - v0) * (zoom - z0)) / (z1 - z0);
}

/** Highest zoom of a layer; above, it has no maximum. */
const MAX_ZOOM = 24;

/**
 * Opacity of a layer faded in over `FADE_ZOOMS` after its minimum zoom and
 * out before its maximum one; unchanged without such bounds, or for an
 * opacity depending on more than the zoom.
 */
function fadeAtBounds(value: unknown, minzoom: number, maxzoom: number): unknown {
  const fadesIn = minzoom > 0;
  const fadesOut = maxzoom < MAX_ZOOM;
  const stops = fadesIn || fadesOut ? opacityStops(value) : null;
  if (!stops) return value;
  const fade = (zoom: number) => (fadesIn ? ramp(zoom, minzoom) : 1) * (fadesOut ? ramp(maxzoom, zoom) : 1);
  const bounds = [...(fadesIn ? [minzoom, minzoom + FADE_ZOOMS] : []), ...(fadesOut ? [maxzoom - FADE_ZOOMS, maxzoom] : [])];
  const zooms = [...new Set([...stops.map(([zoom]) => zoom), ...bounds])]
    .filter((zoom) => zoom >= minzoom && zoom <= maxzoom)
    .sort((a, b) => a - b);
  return ["interpolate", ["linear"], ["zoom"], ...zooms.flatMap((zoom) => [zoom, valueAt(stops, zoom) * fade(zoom)])];
}

/** Paint properties carrying the opacity of each type of layer. */
const OPACITY_PROPERTIES: Partial<Record<LayerSpecification["type"], string[]>> = {
  fill: ["fill-opacity"],
  line: ["line-opacity"],
  symbol: ["text-opacity", "icon-opacity"],
  circle: ["circle-opacity"],
  raster: ["raster-opacity"],
};

/** `layer` fading in and out at the bounds of its zooms: none of its features pops in or out. */
function withZoomFades(layer: LayerSpecification): LayerSpecification {
  const properties = OPACITY_PROPERTIES[layer.type];
  if (!properties) return layer;
  const paint: Paint = { ...layer.paint };
  for (const property of properties) {
    const opacity = fadeAtBounds(paint[property], layer.minzoom ?? 0, layer.maxzoom ?? MAX_ZOOM);
    if (opacity !== undefined) paint[property] = opacity;
  }
  return { ...layer, paint } as LayerSpecification;
}

/**
 * The base style in the colors of `palette`, its roads appearing later and
 * without casings, its boundaries of subdivisions more visible, and every
 * layer fading in and out with the zoom.
 */
export function recolorStyle(style: StyleSpecification, { base }: MapPalette): StyleSpecification {
  return {
    ...style,
    layers: style.layers
      .flatMap((layer) => (layer.id === SUBDIVISION_LAYER_ID ? subdivisionLayers(layer, base) : [layer]))
      .map((layer) => {
        const paint = basePaint(layer, base);
        const recolored = paint ? ({ ...layer, paint: { ...layer.paint, ...paint } } as LayerSpecification) : layer;
        // The roads fade in class by class.
        return isRoad(recolored) ? adjustRoad(recolored) : withZoomFades(recolored);
      }),
  };
}
