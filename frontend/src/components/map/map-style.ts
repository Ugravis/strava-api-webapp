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
   * Largest cluster of large tiles: a quiet wash over them, pale in light,
   * dark in dark. Zoomed in, every large tile takes its look.
   */
  cluster: string;
  clusterOpacity: number;
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
  grid: string;
  track: string;
  /** Faint edge of the tracks: their contrast over the land and the small tiles. */
  trackCasing: string;
  /** Visited countries: the land in its full color, the others desaturated; a neutral border. */
  country: string;
  countryOpacity: number;
  countryBorder: string;
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
  clusterOpacity: 0.75,
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
  grid: "#5b4a35",
  track: "#be185d",
  trackCasing: "#4a0d2e",
  country: "#e8d4ae",
  countryOpacity: 0.85,
  countryBorder: "#a8906a",
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
    boundary: "#6f6658",
    label: "#ece6dc",
    mutedLabel: "#b5ab9c",
    waterLabel: "#d6e6ff",
  },
  tile: "#22c55e",
  tileOpacity: 0.35,
  // Dark: the quiet levels are dark, the prominent ones light.
  cluster: "#0f1f17",
  clusterOpacity: 0.8,
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
  grid: "#a8a29e",
  track: "#fb7185",
  trackCasing: "#1a0f14",
  country: "#3b3226",
  countryOpacity: 0.85,
  countryBorder: "#6f6658",
};

/** Both palettes, for the keys drawn by the page in CSS, whatever the theme resolved. */
export const MAP_PALETTES = { light: LIGHT, dark: DARK } as const;

export function mapPalette(theme: string | undefined): MapPalette {
  return theme === "dark" ? DARK : LIGHT;
}

type Paint = Record<string, unknown>;

/**
 * The rivers and streams fade in once zoomed in on a region; the buildings
 * from zoom 13, where the base map starts serving them.
 */
const WATERWAY_MIN_ZOOM = 8;
const BUILDING_MIN_ZOOM = 13;
/** Zooms over which the waterways and buildings fade in. */
const FEATURE_FADE_ZOOMS = 2;

function fadeFrom(minZoom: number, zooms = FEATURE_FADE_ZOOMS): ExpressionSpecification {
  return ["interpolate", ["linear"], ["zoom"], minZoom, 0, minZoom + zooms, 1];
}

/** The wide rivers are areas of water: they fade in with the waterways, the seas and lakes stay. */
function riverOpacity(): ExpressionSpecification {
  const isRiver: ExpressionSpecification = ["match", ["get", "class"], "river", 0, 1];
  return ["interpolate", ["linear"], ["zoom"], WATERWAY_MIN_ZOOM, isRiver, WATERWAY_MIN_ZOOM + FEATURE_FADE_ZOOMS, 1];
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
            "fill-opacity": fadeFrom(BUILDING_MIN_ZOOM, 1.5),
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
          return { "line-color": base.waterway, "line-opacity": fadeFrom(WATERWAY_MIN_ZOOM) };
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
  rail: 13,
  transit: 16,
  runway: 11,
  taxiway: 12,
};
/** Zoom of the last stop of the fades: every road is opaque by then. */
const ROAD_FADE_END_ZOOM = 17;

const ramp = (zoom: number, from: number) => Math.min(1, Math.max(0, zoom - from));

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

/** The base style in the colors of `palette`, its roads appearing later and without casings. */
export function recolorStyle(style: StyleSpecification, { base }: MapPalette): StyleSpecification {
  return {
    ...style,
    layers: style.layers.map((layer) => {
      const paint = basePaint(layer, base);
      const recolored = paint ? ({ ...layer, paint: { ...layer.paint, ...paint } } as LayerSpecification) : layer;
      if (!isRoad(recolored)) return recolored;
      const appearZoom = roadMinZoom(recolored.id);
      const minzoom = Math.max(recolored.minzoom ?? 0, appearZoom);
      const continues = appearZoom > 0 && (recolored.minzoom ?? 0) > appearZoom;
      // Flat roads: the casings are hidden.
      const layout = recolored.id.includes("casing") ? { ...recolored.layout, visibility: "none" } : recolored.layout;
      return {
        ...recolored,
        minzoom,
        layout,
        paint: { ...recolored.paint, "line-opacity": roadOpacity(minzoom, continues) },
      } as LayerSpecification;
    }),
  };
}
