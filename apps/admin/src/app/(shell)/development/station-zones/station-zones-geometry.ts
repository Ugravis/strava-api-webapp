import type { FeatureCollection, Geometry, LineString, MultiLineString, MultiPolygon, Point, Polygon, Position } from "geojson";

/** A station of the prototype, as built by `scripts/station-zones-poc.mjs`. */
export interface PocStation {
  id: number;
  name: string | null;
  point: Position;
  /** Current rule: the z17 tile holding the point. */
  tile: Position[];
  tileArea: number;
  /** Passenger tracks walked on each side of the point, unwidened. */
  rails: Position[][];
  /** Number of OSM geometries the footprint is made of. */
  osmParts: number;
}

export type Proposal = "osm" | "rails" | "both";
/** How the OSM footprint is drawn: its convex hull, an Apple Plans-like blob, or the features themselves. */
export type Precision = "hull" | "plans" | "fine";

type Shape = Polygon | MultiPolygon;

/** One zone, its area and the small tiles (z17) touching it. */
interface PocShape {
  shape: Shape;
  area: number;
  tiles: { xy: [number, number][]; shape: Shape };
}

/** The zones of one station widened by `r` metres, computed by PostGIS. */
export interface PocZone {
  id: number;
  r: number;
  rails: PocShape;
  hull: Record<"osm" | "both", PocShape>;
  fine: Record<"osm" | "both", PocShape>;
  plans: Record<"osm" | "both", PocShape>;
}

export interface PocDepartment {
  code: string;
  name: string;
  border: LineString | MultiLineString;
  railReach: number;
  widenStep: number;
  widenMax: number;
  stations: PocStation[];
  zones: PocZone[];
  /** Footprints of all the stations merged, per precision: overlapping ones are filled once. */
  footprints: Record<Precision, Shape>;
  /** Rail links of the app between the stations, as on the site map. */
  railLinks: LineString[];
}

export interface ZoneChoice {
  proposal: Proposal;
  precision: Precision;
  widen: number;
}

const pick = (z: PocZone, { proposal, precision }: ZoneChoice) => (proposal === "rails" ? z.rails : z[precision][proposal]);
const widened = (all: PocZone[], widen: number) => all.filter((z) => z.r === widen);

const collection = <G extends Geometry, P>(features: { geometry: G; properties: P }[]): FeatureCollection<G, P> => ({
  type: "FeatureCollection",
  features: features.map((f) => ({ type: "Feature", ...f })),
});

/** The zone of every station, free-shaped or made of small tiles. */
export function zones(all: PocZone[], choice: ZoneChoice, asTiles: boolean): FeatureCollection<Shape, { id: number }> {
  return collection(
    widened(all, choice.widen).map((z) => ({ properties: { id: z.id }, geometry: asTiles ? pick(z, choice).tiles.shape : pick(z, choice).shape })),
  );
}

const lonOf = (x: number) => (x / 2 ** 17) * 360 - 180;
const latOf = (y: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** 17))) * 180) / Math.PI;

/** Every small tile of the zones, outlined one by one. */
export function tileCells(all: PocZone[], choice: ZoneChoice): FeatureCollection<Polygon, null> {
  return collection(
    widened(all, choice.widen)
      .flatMap((z) => pick(z, choice).tiles.xy)
      .map(([x, y]) => {
        const [w, e, n, s] = [lonOf(x), lonOf(x + 1), latOf(y), latOf(y + 1)];
        return { properties: null, geometry: { type: "Polygon" as const, coordinates: [[[w, n], [e, n], [e, s], [w, s], [w, n]]] } };
      }),
  );
}

/** Per station: area of its zone (m²) and number of its small tiles. */
export function figures(all: PocZone[], choice: ZoneChoice): Map<number, { area: number; tiles: number }> {
  return new Map(widened(all, choice.widen).map((z) => [z.id, { area: pick(z, choice).area, tiles: pick(z, choice).tiles.xy.length }]));
}

/** The OSM footprint of every station, unwidened: drawn over the tiles, for the eye only. */
export function footprints(all: PocZone[], precision: Precision): FeatureCollection<Shape, { id: number }> {
  return collection(widened(all, 0).map((z) => ({ properties: { id: z.id }, geometry: z[precision].osm.shape })));
}

/** The merged footprints of the départements: their fill, overlaps drawn once. */
export function footprintFill(departments: PocDepartment[], precision: Precision): FeatureCollection<Shape, null> {
  return collection(departments.filter((d) => d.footprints[precision]).map((d) => ({ properties: null, geometry: d.footprints[precision] })));
}

export function railLinks(departments: PocDepartment[]): FeatureCollection<LineString, null> {
  return collection(departments.flatMap((d) => d.railLinks.map((geometry) => ({ properties: null, geometry }))));
}

/** Tracks walked from every station, drawn thin under the zones. */
export function tracks(stations: PocStation[]): FeatureCollection<LineString, null> {
  return collection(stations.flatMap((s) => s.rails.map((line) => ({ properties: null, geometry: { type: "LineString" as const, coordinates: line } }))));
}

export function tiles(stations: PocStation[]): FeatureCollection<Polygon, { id: number }> {
  return collection(stations.map((s) => ({ properties: { id: s.id }, geometry: { type: "Polygon" as const, coordinates: [s.tile] } })));
}

export function points(stations: PocStation[]): FeatureCollection<Point, { id: number; name: string }> {
  return collection(stations.map((s) => ({ properties: { id: s.id, name: s.name ?? "" }, geometry: { type: "Point" as const, coordinates: s.point } })));
}

export function borders(departments: PocDepartment[]): FeatureCollection<LineString | MultiLineString, { name: string }> {
  return collection(departments.map((d) => ({ properties: { name: d.name }, geometry: d.border })));
}

/** Bounds [west, south, east, north] of a département border. */
export function boundsOf(d: PocDepartment): [number, number, number, number] {
  const coords = (d.border.type === "LineString" ? [d.border.coordinates] : d.border.coordinates).flat();
  const lons = coords.map((c) => c[0]);
  const lats = coords.map((c) => c[1]);
  return [Math.min(...lons), Math.min(...lats), Math.max(...lons), Math.max(...lats)];
}
