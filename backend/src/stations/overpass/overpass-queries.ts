/** `[south, west, north, east]` in degrees, the order of Overpass. */
export type Bbox = [number, number, number, number];

/** A train station as read from OpenStreetMap. */
export interface OsmStation {
  /** Id of the OSM node. */
  id: number;
  lat: number;
  lon: number;
  /** Null when the node has no name. */
  name: string | null;
}

/** A railway way: its nodes and their positions, in the same order. */
export interface OsmRailWay {
  id: number;
  nodes: number[];
  /** `[lon, lat]` of each node. */
  coords: [number, number][];
}

export interface OsmRailways {
  ways: OsmRailWay[];
  /** Date of the OSM data the answer was read from. */
  osmTimestamp: Date | null;
}

/**
 * Stations served by trains: `railway=station` and `railway=halt` nodes,
 * without those of the metro, the tram, the light rail, the monorail, the
 * funiculars and the miniature railways.
 */
const STATION_FILTER =
  'node[railway~"^(station|halt)$"][station!~"^(subway|light_rail|monorail|funicular|tram|miniature)$"]';

/**
 * Tracks walked between stations: main and branch lines, heritage lines
 * included, without the yards, sidings and spurs, nor the industrial,
 * military and test lines, which would link stations that no train links.
 */
const RAILWAY_FILTER =
  'way[railway~"^(rail|preserved|narrow_gauge)$"][service!~"^(yard|siding|spur)$"][usage!~"^(industrial|military|test)$"]';

function bboxOf([south, west, north, east]: Bbox): string {
  return [south, west, north, east].map((value) => value.toFixed(6)).join(',');
}

/** Stations of an area, as tab-separated id, latitude, longitude and name. */
export function stationsQuery(bbox: Bbox): string {
  return `[out:csv(::id,::lat,::lon,name;false)][timeout:900];${STATION_FILTER}(${bboxOf(bbox)});out;`;
}

/** Railway ways crossing an area, with their nodes and positions, without their tags. */
export function railwaysQuery(bbox: Bbox): string {
  return `[out:json][timeout:300];${RAILWAY_FILTER}(${bboxOf(bbox)});out skel geom;`;
}

export function parseStations(csv: string): OsmStation[] {
  const stations: OsmStation[] = [];
  for (const line of csv.split('\n')) {
    const [id, lat, lon, ...name] = line.split('\t');
    if (!id || !lat || !lon) {
      continue;
    }
    const station = {
      id: Number(id),
      lat: Number(lat),
      lon: Number(lon),
      name: name.join('\t').trim() || null,
    };
    if (
      Number.isSafeInteger(station.id) &&
      Number.isFinite(station.lat) &&
      Number.isFinite(station.lon)
    ) {
      stations.push(station);
    }
  }
  return stations;
}

interface OverpassJson {
  osm3s?: { timestamp_osm_base?: string };
  remark?: string;
  elements?: {
    type: string;
    id: number;
    nodes?: number[];
    geometry?: ({ lat: number; lon: number } | null)[];
  }[];
}

export function parseRailways(json: string): OsmRailways {
  const body = JSON.parse(json) as OverpassJson;
  // A query stopped by the server still answers 200, with a remark.
  if (body.remark && /error|timed out|out of memory/i.test(body.remark)) {
    throw new Error(`Overpass query failed: ${body.remark}`);
  }
  const ways: OsmRailWay[] = [];
  for (const element of body.elements ?? []) {
    if (element.type !== 'way' || !element.nodes || !element.geometry) {
      continue;
    }
    const nodes: number[] = [];
    const coords: [number, number][] = [];
    // Positions are null for the nodes outside the data of the server.
    element.geometry.forEach((point, i) => {
      if (point) {
        nodes.push(element.nodes![i]);
        coords.push([point.lon, point.lat]);
      }
    });
    if (nodes.length >= 2) {
      ways.push({ id: element.id, nodes, coords });
    }
  }
  const timestamp = body.osm3s?.timestamp_osm_base;
  return { ways, osmTimestamp: timestamp ? new Date(timestamp) : null };
}
