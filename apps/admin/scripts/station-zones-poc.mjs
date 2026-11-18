#!/usr/bin/env node
/**
 * Station zones POC: builds the zones of the stations of one French
 * département, shown by /development/station-zones.
 *
 * Usage: node apps/admin/scripts/station-zones-poc.mjs [<ISO 3166-2 code> [<overpass.json> <out.json>]]
 *
 * - Without arguments, every département of the page (DEPARTMENTS).
 * - The code: FR-13, FR-18, FR-75C (Paris is a collectivité in OSM)...
 * - overpass.json: answer of overpassQuery(code) (`out geom`); fetched and
 *   written there when the file does not exist yet. By default kept in
 *   OVERPASS_CACHE (not versioned): the shapes are computed again from it,
 *   without asking Overpass, as long as the file is there.
 * - out.json: by default the file of the page, in OUT_DIR.
 * - The stations are the kept ones of the dev database mapped inside the département.
 *
 * Every shape is computed by PostGIS in the dev database container
 * (DB_CONTAINER), in Lambert-93 metres: buffering in the browser took seconds.
 *
 * Proposals per station, each widened by 0 to WIDEN_MAX metres:
 * - `osm`: what OpenStreetMap maps for the station (its stop_area members, the
 *   platforms next to it, its station area and building), in two precisions:
 *   `hull` (convex hull), `plans` (as Apple Plans draws it: the platforms
 *   themselves, the tracks between them filled, square ends, edges along the
 *   platforms, every track along them taken in with TRACK_MARGIN on each side,
 *   joined to the station buildings, no holes) or
 *   `fine` (every feature itself, gaps under twice CLOSING metres closed);
 * - `rails`: the passenger tracks walked RAIL_REACH metres on each side of the
 *   station point, from every track next to it;
 * - `both`: their union.
 * Each comes with the small tiles (z17) it touches.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const overpassQuery = (code) => `[out:json][timeout:300];
area["ISO3166-2"="${code}"]->.a;
nwr["railway"~"^(station|halt)$"](area.a)->.st;
(
  .st;
  way["building"~"^(roof|train_station|transportation)$"](around.st:300);
  way["building"](around.st:30);
  nwr["public_transport"="station"](area.a);
  nwr["railway"="platform"](area.a);
  nwr["public_transport"="platform"]["train"="yes"](area.a);
  nwr["building"="train_station"](area.a);
  way["railway"~"^(rail|narrow_gauge)$"](area.a);
  relation["public_transport"="stop_area"](area.a);
  relation["boundary"="administrative"]["ISO3166-2"="${code}"];
);
out geom;`;

/** Metres of track walked on each side of the station point. */
const RAIL_REACH = 100;
/** Platforms and station areas this close to a station belong to it (the nearest one). */
const PLATFORM_RADIUS = 150;
/** Tracks this much farther than the nearest one still start a walk. */
const TRACK_SLACK = 40;
const TRACK_MAX_DISTANCE = 150;
/** Fine footprint: gaps narrower than twice this are closed (between platforms, tracks...). */
const CLOSING = 15;
/** Plans footprint: platforms drawn as lines are this wide (m). */
const PLATFORM_WIDTH = 8;
/** Plans footprint: gaps between the platforms of a level narrower than twice this are filled (the tracks between them). */
const PLATFORM_CLOSING = 10;
/** Plans footprint: a track this close to the platforms of its level runs along them... */
const TRACK_ALONG = 6;
/** ...and is taken in with this margin on each side (m), a little more than a platform. */
const TRACK_MARGIN = 12;
/** A platform is kept when a passenger track of its level runs this close to it (m). */
const PLATFORM_TRACK = 15;
/** Plans footprint: spikes of the platforms and tracks narrower than twice this are trimmed (m). */
const SPIKE_OPENING = 6;
/** Tracks looked at around a station (m): its platforms reach that far at most. */
const TRACK_RADIUS = 1000;
/** Plans footprint: gaps narrower than twice this are closed between the platforms and the buildings... */
const PLANS_CLOSING = 15;
/** ...then the shape is grown by this margin. */
const PLANS_PADDING = 2;
/** Roofs and transport buildings this close to a platform of the station are part of it. */
const ROOF_RADIUS = 8;
/** Widenings computed, in metres: 0 to WIDEN_MAX by WIDEN_STEP. */
const WIDEN_STEP = 10;
const WIDEN_MAX = 100;
/** Web Mercator: half the world width and the side of a z17 tile, in metres. */
const HALF_WORLD = 20037508.342789244;
const TILE_SIZE = (2 * HALF_WORLD) / 2 ** 17;
const DB_CONTAINER = process.env.DB_CONTAINER ?? "strava-webapp-db-1";

const HERE = dirname(fileURLToPath(import.meta.url));
/** Answers of Overpass, kept between runs (not versioned). */
const OVERPASS_CACHE = join(HERE, ".station-zones-cache");
/** Files read by the page (not versioned). */
const OUT_DIR = join(HERE, "../public/development/station-zones");
/** Départements of the page: ISO 3166-2 code and the name of its file. */
const DEPARTMENTS = { "FR-13": "fr-13", "FR-18": "fr-18", "FR-48": "fr-48", "FR-75C": "fr-75" };

const [code, overpassArg, outArg] = process.argv.slice(2);
if (!code) {
  // Every département of the page, one run each.
  for (const one of Object.keys(DEPARTMENTS)) execFileSync(process.execPath, [fileURLToPath(import.meta.url), one], { stdio: "inherit" });
  process.exit(0);
}
const overpassPath = overpassArg ?? join(OVERPASS_CACHE, `${code}.overpass.json`);
const outPath = outArg ?? join(OUT_DIR, `${DEPARTMENTS[code] ?? code.toLowerCase()}.json`);
mkdirSync(dirname(overpassPath), { recursive: true });
mkdirSync(dirname(outPath), { recursive: true });

if (!existsSync(overpassPath)) {
  console.log(`Fetching ${code} from Overpass…`);
  // Overpass often answers 502 or 504 when busy: tried again, a minute apart at most.
  for (let attempt = 1; ; attempt++) {
    const response = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: { "User-Agent": "kilotrace-station-zones-poc/1.0" },
      body: new URLSearchParams({ data: overpassQuery(code) }),
    });
    if (response.ok) {
      writeFileSync(overpassPath, await response.text());
      break;
    }
    if (attempt === 4) throw new Error(`Overpass answered ${response.status}`);
    console.log(`Overpass answered ${response.status}, trying again…`);
    await new Promise((resolve) => setTimeout(resolve, 20_000 * attempt));
  }
}
const elements = JSON.parse(readFileSync(overpassPath, "utf8")).elements;
const byKey = new Map(elements.map((e) => [`${e.type[0]}${e.id}`, e]));
const tags = (e) => e.tags ?? {};

/** Runs SQL in the dev database, the answer read as JSON. */
function psqlJson(sql) {
  const answer = execFileSync("docker", ["exec", "-i", DB_CONTAINER, "sh", "-c", 'psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -At -v ON_ERROR_STOP=1'], {
    input: sql,
    maxBuffer: 1 << 30,
  });
  return JSON.parse(answer.toString());
}
const sqlText = (v) => (v == null ? "NULL" : `'${String(v).replaceAll("'", "''")}'`);

// --- Local metric projection, per station --------------------------------------------------
const R = 6371008.8;
const projector = ([lon0, lat0]) => {
  const k = Math.cos((lat0 * Math.PI) / 180);
  return ([lon, lat]) => [((lon - lon0) * Math.PI * R * k) / 180, ((lat - lat0) * Math.PI * R) / 180];
};
const dist = (a, b) => Math.hypot(a[0] - b[0], a[1] - b[1]);
/** Distance from p to segment ab, and the position (0..1) of its foot. */
function toSegment(p, a, b) {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / len2));
  return { d: dist(p, [a[0] + t * dx, a[1] + t * dy]), t };
}
const lerp = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

const wayCoords = (geometry) => (geometry ?? []).map((g) => [g.lon, g.lat]);
/** Every [lon, lat] vertex of an element fetched with `out geom`. */
function vertices(e) {
  if (e.type === "node") return [[e.lon, e.lat]];
  if (e.type === "way") return wayCoords(e.geometry);
  return (e.members ?? []).flatMap((m) => (m.type === "node" ? [[m.lon, m.lat]] : wayCoords(m.geometry)));
}
/** A ring when closed (an area), else a line. */
function shapeOf(coords) {
  if (coords.length < 2) return null;
  const [a, b] = [coords[0], coords[coords.length - 1]];
  const closed = coords.length >= 4 && a[0] === b[0] && a[1] === b[1];
  return closed ? { type: "Polygon", coordinates: [coords] } : { type: "LineString", coordinates: coords };
}
/** The geometries of an element: a node is a point, a closed way an area. */
function geometriesOf(e) {
  if (e.type === "node") return [{ type: "Point", coordinates: [e.lon, e.lat] }];
  if (e.type === "way") return [shapeOf(wayCoords(e.geometry))].filter(Boolean);
  return (e.members ?? [])
    .map((m) => (m.type === "node" ? { type: "Point", coordinates: [m.lon, m.lat] } : shapeOf(wayCoords(m.geometry))))
    .filter(Boolean);
}

// --- Stations ---------------------------------------------------------------------------
const candidateKeys = elements.filter((e) => ["station", "halt"].includes(tags(e).railway)).map((e) => `${e.type[0]}${e.id}`);
const stations = psqlJson(`
SELECT coalesce(json_agg(json_build_object('id', id, 'key', osm_type || osm_id, 'name', name, 'point', json_build_array(ST_X(geom), ST_Y(geom))) ORDER BY name), '[]')
FROM places WHERE kind = 'station' AND osm_type || osm_id = ANY(ARRAY[${candidateKeys.map(sqlText).join(",") || "NULL"}]::text[]);`);

// --- Proposal 1: what OSM maps for the station ---------------------------------------------
const isPlatform = (e) => {
  const t = tags(e);
  if (t.tram === "yes" || t.bus === "yes" || t.subway === "yes") return false;
  return t.railway === "platform" || (t.public_transport === "platform" && t.train === "yes");
};
const isStationArea = (e) =>
  e.type !== "node" && (tags(e).public_transport === "station" || tags(e).railway === "station" || tags(e).building === "train_station");

/** Nearest station of a feature, by its nearest vertex. */
function nearestStation(e) {
  let best = null;
  const vs = vertices(e);
  for (const s of stations) {
    const proj = projector(s.point);
    const d = Math.min(...vs.map((v) => dist(proj(v), [0, 0])));
    if (!best || d < best.d) best = { s, d };
  }
  return best;
}
const claimed = new Map(stations.map((s) => [s.key, []]));
for (const e of elements) {
  if (!isPlatform(e) && !isStationArea(e)) continue;
  const near = nearestStation(e);
  if (near && near.d <= PLATFORM_RADIUS) claimed.get(near.s.key).push(e);
}
const stopAreas = elements.filter((e) => e.type === "relation" && tags(e).public_transport === "stop_area");

/** The OSM features of a station, as a GeoJSON geometry collection. */
function osmFeatures(s) {
  const parts = new Map(claimed.get(s.key).map((e) => [`${e.type[0]}${e.id}`, e]));
  for (const area of stopAreas) {
    const refs = (area.members ?? []).map((m) => `${m.type[0]}${m.ref}`);
    if (!refs.includes(s.key)) continue;
    for (const ref of refs) {
      const e = byKey.get(ref);
      // A stop area may hold a far bus station: its train features only, next to the station.
      if (e && (isPlatform(e) || isStationArea(e)) && nearestStation(e).d <= 2 * PLATFORM_RADIUS) parts.set(ref, e);
    }
  }
  return { parts: [...parts.values()], type: "GeometryCollection", geometries: [...parts.values()].flatMap(geometriesOf) };
}

const isBuilding = (e) => e.type === "way" && tags(e).building !== undefined;
const ROOFS = new Set(["roof", "train_station", "transportation"]);
/** Distance in metres from a point to an element, 0 inside a closed way. */
function distanceTo(e, point) {
  const proj = projector(point);
  const pts = vertices(e).map(proj);
  if (pts.length === 1) return dist(pts[0], [0, 0]);
  let inside = false;
  for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
    const [a, b] = [pts[i], pts[j]];
    if (a[1] > 0 !== b[1] > 0 && 0 < ((b[0] - a[0]) * -a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
  }
  if (inside) return 0;
  return Math.min(...pts.slice(1).map((p, i) => toSegment([0, 0], pts[i], p).d));
}

/**
 * What Apple Plans draws for a station: its platforms, its buildings tagged as
 * the station and the roofs over the platforms. Station areas drawn wide (whole
 * yards) are left out, and so are untagged buildings next to the node: the
 * node of an underground station may lie in any building (Auber in the Opéra).
 */
function plansFeatures(s, features) {
  const proj = projector(s.point);
  const nearTracks = tracks.filter((w) => {
    const pts = w.geometry.map((g) => proj([g.lon, g.lat]));
    return pts.some((p, i) => i > 0 && toSegment([0, 0], pts[i - 1], p).d <= TRACK_RADIUS);
  });
  // A train platform runs along a passenger track of its level: metro platforms tagged as train
  // ones (line 14 under Bibliothèque François Mitterrand) have none, their tracks are railway=subway.
  const segments = (below) =>
    nearTracks.filter((w) => isUnderground(w) === below).flatMap((w) => w.geometry.slice(1).map((g, i) => [proj([w.geometry[i].lon, w.geometry[i].lat]), proj([g.lon, g.lat])]));
  const levelSegments = new Map([false, true].map((below) => [below, segments(below)]));
  const alongTrack = (p) =>
    vertices(p).map(proj).some((v) => levelSegments.get(isUnderground(p)).some(([a, b]) => toSegment(v, a, b).d <= PLATFORM_TRACK));
  const platforms = features.parts.filter(isPlatform).filter(alongTrack);
  const near = (e, list, radius) => list.some((p) => vertices(e).some((v) => distanceTo(p, v) <= radius));
  // Buildings under the ground (a metro hall) do not show on the map.
  const buildings = elements.filter((b) => isBuilding(b) && !isUnderground(b)).filter((b) => {
    const t = tags(b);
    if (t.railway === "station" || t.public_transport === "station" || t.building === "train_station") return distanceTo(b, s.point) <= PLATFORM_RADIUS;
    return ROOFS.has(t.building) && platforms.length > 0 && near(b, platforms, ROOF_RADIUS);
  });
  const collect = (list) => ({ type: "GeometryCollection", geometries: list.flatMap(geometriesOf) });
  // Each level apart, its platforms and the tracks that may run along them: an RER under a surface
  // station is not joined to it. Underground platforms take every track, a track changing its tags
  // along them (Arenc: level -1 then none); surface ones every track but those in a tunnel.
  const inTunnel = (w) => tags(w).tunnel === "yes" || tags(w).location === "underground";
  const levels = [false, true].map((below) => {
    const lines = nearTracks.filter((w) => below || !inTunnel(w)).map((w) => wayCoords(w.geometry));
    return {
      platforms: collect(platforms.filter((p) => isUnderground(p) === below)),
      tracks: lines.length ? { type: "MultiLineString", coordinates: lines } : null,
    };
  });
  return { buildings: collect(buildings), levels };
}

/**
 * Whether a platform or a track lies under the ground (an RER or metro line under the city).
 * The level says it when given: tracks in a covered trench (Austerlitz) are tagged as a tunnel at
 * level 0, as their platforms. A negative layer alone is not enough: they are drawn below the streets.
 */
function isUnderground(e) {
  const t = tags(e);
  if (t.level !== undefined && !Number.isNaN(Number.parseFloat(t.level))) return Number.parseFloat(t.level) < 0;
  return t.location === "underground" || t.tunnel === "yes";
}

// --- Proposal 2: the passenger tracks around the station ------------------------------------
const NON_PASSENGER = new Set(["industrial", "military", "test"]);
const SERVICE = new Set(["yard", "siding", "spur"]);
const tracks = elements.filter(
  (e) =>
    e.type === "way" &&
    ["rail", "narrow_gauge"].includes(tags(e).railway) &&
    !SERVICE.has(tags(e).service) &&
    !NON_PASSENGER.has(tags(e).usage) &&
    e.nodes?.length === e.geometry?.length,
);
/** node id → [{ way, index }]: where the walk may continue. */
const nodeWays = new Map();
for (const w of tracks) {
  w.nodes.forEach((n, i) => {
    if (!nodeWays.has(n)) nodeWays.set(n, []);
    nodeWays.get(n).push({ w, i });
  });
}

/** Walks `budget` metres from vertex i of way w in direction dir (±1), every branch. */
function walk(w, i, dir, budget, proj, unproj, out, seen) {
  const line = [[w.geometry[i].lon, w.geometry[i].lat]];
  let left = budget;
  let j = i;
  while (left > 0) {
    const k = j + dir;
    if (k < 0 || k >= w.nodes.length) break;
    const a = proj([w.geometry[j].lon, w.geometry[j].lat]);
    const b = proj([w.geometry[k].lon, w.geometry[k].lat]);
    const len = dist(a, b);
    if (len >= left) {
      line.push(unproj(lerp(a, b, left / len)));
      left = 0;
      break;
    }
    line.push([w.geometry[k].lon, w.geometry[k].lat]);
    left -= len;
    j = k;
  }
  if (line.length > 1) out.push(line);
  if (left <= 0) return;
  // End of the way: carry on along every other way meeting this node.
  for (const next of nodeWays.get(w.nodes[j]) ?? []) {
    const id = `${next.w.id}:${next.i}`;
    if (next.w === w || seen.has(id)) continue;
    seen.add(id);
    for (const d of [1, -1]) walk(next.w, next.i, d, left, proj, unproj, out, seen);
  }
}

function railReach(s) {
  const proj = projector(s.point);
  const k = Math.cos((s.point[1] * Math.PI) / 180);
  const unproj = ([x, y]) => [s.point[0] + (x * 180) / (Math.PI * R * k), s.point[1] + (y * 180) / (Math.PI * R)];
  const feet = [];
  for (const w of tracks) {
    const pts = w.geometry.map((g) => proj([g.lon, g.lat]));
    let best = null;
    for (let i = 0; i + 1 < pts.length; i++) {
      const f = toSegment([0, 0], pts[i], pts[i + 1]);
      if (!best || f.d < best.d) best = { w, i, ...f, a: pts[i], b: pts[i + 1] };
    }
    if (best && best.d <= TRACK_MAX_DISTANCE) feet.push(best);
  }
  if (!feet.length) return [];
  const nearest = Math.min(...feet.map((f) => f.d));
  const lines = [];
  for (const f of feet.filter((f) => f.d <= nearest + TRACK_SLACK)) {
    const foot = lerp(f.a, f.b, f.t);
    const seen = new Set();
    // Forward from the foot: to vertex i+1 first, then on; backward: to vertex i first.
    for (const [end, vertex, dir] of [
      [f.b, f.i + 1, 1],
      [f.a, f.i, -1],
    ]) {
      const reach = dist(foot, end);
      if (reach >= RAIL_REACH) lines.push([unproj(foot), unproj(lerp(foot, end, RAIL_REACH / reach))]);
      else {
        lines.push([unproj(foot), unproj(end)]);
        walk(f.w, vertex, dir, RAIL_REACH - reach, proj, unproj, lines, seen);
      }
    }
  }
  return lines;
}

// --- Current rule: the z17 tile of the point ----------------------------------------------
function z17Tile([lon, lat]) {
  const n = 2 ** 17;
  const x = Math.floor(((lon + 180) / 360) * n);
  const latR = (lat * Math.PI) / 180;
  const y = Math.floor(((1 - Math.log(Math.tan(latR) + 1 / Math.cos(latR)) / Math.PI) / 2) * n);
  const lonOf = (tx) => (tx / n) * 360 - 180;
  const latOf = (ty) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * ty) / n))) * 180) / Math.PI;
  const [w, e, nn, s] = [lonOf(x), lonOf(x + 1), latOf(y), latOf(y + 1)];
  return [[w, nn], [e, nn], [e, s], [w, s], [w, nn]];
}
/** Shoelace area of a closed ring in metres. */
const planarArea = (ring) => Math.abs(ring.slice(1).reduce((sum, p, i) => sum + ring[i][0] * p[1] - p[0] * ring[i][1], 0)) / 2;
const round = (p) => p.map((v) => Math.round(v * 1e7) / 1e7);

const out = stations.map((s) => ({
  id: s.id,
  name: s.name,
  point: round(s.point),
  tile: z17Tile(s.point).map(round),
  tileArea: Math.round(planarArea(z17Tile(s.point).map(projector(s.point)))),
  ...(() => {
    const features = osmFeatures(s);
    return { features: { type: features.type, geometries: features.geometries }, ...plansFeatures(s, features) };
  })(),
  rails: railReach(s).map((l) => l.map(round)),
}));

// --- Shapes, by PostGIS ---------------------------------------------------------------------
const rows = out
  .map((s) => {
    const rails = s.rails.length ? JSON.stringify({ type: "MultiLineString", coordinates: s.rails }) : null;
    return `(${s.id}, ${sqlText(JSON.stringify(s.features))}, ${sqlText(JSON.stringify(s.buildings))}, ${s.levels
      .flatMap((l) => [sqlText(JSON.stringify(l.platforms)), sqlText(l.tracks && JSON.stringify(l.tracks))])
      .join(", ")}, ${sqlText(rails)}, ${sqlText(JSON.stringify({ type: "Point", coordinates: s.point }))})`;
  })
  .join(",\n");
const L93 = (geojson) => `ST_Transform(ST_SetSRID(ST_GeomFromGeoJSON(${geojson}), 4326), 2154)`;
/** GeoJSON in WGS 84 of a Lambert-93 geometry, 0.1 m precision. */
const json = (g) => `ST_AsGeoJSON(ST_Transform(${g}, 4326), 6)::json`;
/** Small tiles (z17) touching a Lambert-93 geometry, and their union. */
const tilesOf = (g) => `(
    SELECT json_build_object('xy', json_agg(json_build_array(tx, ty) ORDER BY tx, ty), 'shape', ST_AsGeoJSON(ST_Transform(ST_Union(env), 4326), 6)::json)
    FROM (SELECT ST_Transform(${g}, 3857) AS m) AS p
    CROSS JOIN LATERAL generate_series(floor((ST_XMin(p.m) + ${HALF_WORLD}) / ${TILE_SIZE})::int, floor((ST_XMax(p.m) + ${HALF_WORLD}) / ${TILE_SIZE})::int) AS tx
    CROSS JOIN LATERAL generate_series(floor((${HALF_WORLD} - ST_YMax(p.m)) / ${TILE_SIZE})::int, floor((${HALF_WORLD} - ST_YMin(p.m)) / ${TILE_SIZE})::int) AS ty
    CROSS JOIN LATERAL (SELECT ST_TileEnvelope(17, tx, ty) AS env) AS e
    WHERE ST_Intersects(e.env, p.m)
  )`;
/** The platforms of a GeoJSON collection as areas, in Lambert-93: those drawn as lines get PLATFORM_WIDTH, square ends. */
const platformAreas = (geojson) => `ST_Union(ARRAY(
      SELECT CASE ST_Dimension(d.geom) WHEN 2 THEN ST_MakeValid(d.geom)
        ELSE ST_Buffer(d.geom, ${PLATFORM_WIDTH / 2}, 'endcap=flat join=mitre mitre_limit=5') END
      FROM ST_Dump(${L93(geojson)}) AS d WHERE ST_Dimension(d.geom) > 0
    ))`;
/** `shape` with the tracks inside `within` taken in, TRACK_MARGIN on each side, square ends. */
const alongTracks = (shape, tracks, within) => `ST_Union(${shape}, coalesce(ST_Buffer(
        ST_CollectionExtract(ST_Intersection(${tracks}, ${within}), 2),
        ${TRACK_MARGIN}, 'endcap=flat join=mitre mitre_limit=5'), ${shape}))`;
/** The Plans finish: gaps closed with square corners, grown by PLANS_PADDING. */
const finish = (g) => `ST_Buffer(ST_Buffer(${g}, ${PLANS_CLOSING}, 'join=mitre mitre_limit=5'), ${PLANS_PADDING - PLANS_CLOSING}, 'join=mitre mitre_limit=5')`;
/** A shape without holes nor crumbs (parts under a tenth of the largest one). */
const solid = (g) => `(
    SELECT ST_Collect(ST_MakePolygon(ST_ExteriorRing(part.geom)))
    FROM (SELECT ${g} AS blob) AS x
    CROSS JOIN LATERAL ST_Dump(ST_SimplifyPreserveTopology(x.blob, 0.5)) AS part
    WHERE ST_Area(part.geom) >= 0.1 * (SELECT max(ST_Area(y.geom)) FROM ST_Dump(x.blob) AS y)
  )`;
const shape = (g) => `json_build_object('shape', ${json(g)}, 'area', round(ST_Area(${g})), 'tiles', ${tilesOf(g)})`;

const shapes = psqlJson(`
WITH s(id, features, buildings, surface, surface_tracks, below, below_tracks, rails, pt) AS (VALUES ${rows}),
b AS (
  SELECT s.id, ${L93("s.pt")} AS pt,
    CASE WHEN s.rails IS NULL THEN NULL ELSE ${L93("s.rails")} END AS rails,
    -- Every track around the station: those of the underground platforms.
    CASE WHEN s.below_tracks IS NULL THEN NULL ELSE ${L93("s.below_tracks")} END AS tracks,
    ${L93("s.features")} AS features,
    ST_Union(ARRAY(SELECT ST_MakeValid(d.geom) FROM ST_Dump(${L93("s.buildings")}) AS d WHERE ST_Dimension(d.geom) = 2)) AS buildings,
    -- The platforms of each level, the tracks between them filled: a closing with mitre
    -- joins, which keeps the outer edges along the platforms, their corners square. Every
    -- track running along them is then taken in, TRACK_MARGIN on each side, square ends; then
    -- every track inside the shape so grown, cut to it: the tails do not grow. The square ends
    -- of tracks fanning out leave spikes at the ends: an opening (mitre joins) trims them.
    ST_Union(ARRAY(
      SELECT ST_Buffer(ST_Buffer(${alongTracks("g1.shape", "g1.tracks", "g1.shape")},
        -${SPIKE_OPENING}, 'join=mitre mitre_limit=5'), ${SPIKE_OPENING}, 'join=mitre mitre_limit=5')
      FROM (
        SELECT l.tracks, ${alongTracks("l.closed", "l.tracks", `ST_Buffer(l.closed, ${TRACK_ALONG}, 'join=mitre mitre_limit=5')`)} AS shape
        FROM (
          SELECT ST_Buffer(ST_Buffer(${platformAreas("v.p")}, ${PLATFORM_CLOSING}, 'join=mitre mitre_limit=5'), -${PLATFORM_CLOSING}, 'join=mitre mitre_limit=5') AS closed,
            CASE WHEN v.t IS NULL THEN NULL ELSE ${L93("v.t")} END AS tracks
          FROM (VALUES (s.surface, s.surface_tracks), (s.below, s.below_tracks)) AS v(p, t)
        ) AS l
        WHERE l.closed IS NOT NULL AND NOT ST_IsEmpty(l.closed)
      ) AS g1
    )) AS blocks
  FROM s
),
base AS MATERIALIZED (
  SELECT b.id, b.pt, b.rails,
    -- Convex hull of every feature and of the point.
    ST_ConvexHull(ST_Collect(b.features, b.pt)) AS hull,
    -- The features themselves: areas kept, platforms drawn as lines get 2 m, nodes 4 m,
    -- then the gaps between them closed.
    ST_MakeValid(ST_Buffer(ST_Buffer(ST_Union(ARRAY(
      SELECT CASE ST_Dimension(d.geom) WHEN 2 THEN ST_MakeValid(d.geom) WHEN 1 THEN ST_Buffer(d.geom, 2, 'quad_segs=8') ELSE ST_Buffer(d.geom, 4, 'quad_segs=8') END
      FROM ST_Dump(ST_Collect(b.features, b.pt)) AS d
    )), ${CLOSING}, 'quad_segs=8'), -${CLOSING}, 'quad_segs=8')) AS fine,
    -- The tracks walked RAIL_REACH metres on each side, drawn as the tracks of the Plans
    -- footprint: TRACK_MARGIN on each side, square ends, then every track inside, spikes trimmed.
    CASE WHEN b.rails IS NULL THEN NULL ELSE ST_Buffer(ST_Buffer(
      ${alongTracks("r.walked", "b.tracks", "r.walked")},
      -${SPIKE_OPENING}, 'join=mitre mitre_limit=5'), ${SPIKE_OPENING}, 'join=mitre mitre_limit=5') END AS rail_block,
    -- What the Plans footprint is drawn from: the platforms and buildings mapped, else the tracks.
    CASE WHEN coalesce(b.blocks, b.buildings) IS NOT NULL THEN 'osm' WHEN b.rails IS NOT NULL THEN 'rails' ELSE 'point' END AS source,
    b.blocks, b.buildings
  FROM b
  CROSS JOIN LATERAL (SELECT ST_Buffer(b.rails, ${TRACK_MARGIN}, 'endcap=flat join=mitre mitre_limit=5') AS walked) AS r
),
shapes AS MATERIALIZED (
  SELECT base.*,
    -- Plans: the blocks of platforms joined to the buildings; nothing mapped, the tracks;
    -- no track either, a small square on the point.
    ${solid(finish("coalesce(ST_Union(blocks, buildings), blocks, buildings, rail_block, ST_Buffer(pt, 15, 'endcap=square'))"))} AS plans,
    ${solid(finish("coalesce(rail_block, ST_Buffer(pt, 15, 'endcap=square'))"))} AS rails_shape
  FROM base
),
w(r) AS (SELECT generate_series(0, ${WIDEN_MAX}, ${WIDEN_STEP})),
g AS (
  SELECT base.id, w.r,
    CASE WHEN w.r = 0 THEN hull ELSE ST_Buffer(hull, w.r, 'quad_segs=8') END AS hull,
    CASE WHEN w.r = 0 THEN fine ELSE ST_Buffer(fine, w.r, 'quad_segs=8') END AS fine,
    -- Plans and rails widened with square corners, as they are drawn.
    CASE WHEN w.r = 0 THEN plans ELSE ST_Buffer(plans, w.r, 'join=mitre mitre_limit=5') END AS plans,
    CASE WHEN w.r = 0 THEN rails_shape ELSE ST_Buffer(rails_shape, w.r, 'join=mitre mitre_limit=5') END AS rails
  FROM shapes AS base CROSS JOIN w
),
-- Each shape is read three times (outline, area, tiles): computed once.
u AS MATERIALIZED (
  SELECT id, r, hull, fine, plans, rails,
    ST_Union(hull, rails) AS hull_both, ST_Union(fine, rails) AS fine_both, ST_Union(plans, rails) AS plans_both
  FROM g
)
SELECT json_build_object(
  'zones', (SELECT json_agg(json_build_object(
  'id', id, 'r', r,
  'rails', ${shape("rails")},
  'hull', json_build_object('osm', ${shape("hull")}, 'both', ${shape("hull_both")}),
  'fine', json_build_object('osm', ${shape("fine")}, 'both', ${shape("fine_both")}),
  'plans', json_build_object('osm', ${shape("plans")}, 'both', ${shape("plans_both")})
) ORDER BY id, r) FROM u),
  -- Footprints of all the stations merged: overlapping ones are filled once.
  'footprints', (SELECT json_build_object('hull', ${json("ST_Union(hull)")}, 'fine', ${json("ST_Union(fine)")}, 'plans', ${json("ST_Union(plans)")}) FROM shapes),
  -- What the Plans footprint of each station is drawn from.
  'sources', (SELECT json_object_agg(id, source) FROM shapes)
);`);
const { zones, footprints, sources } = shapes;

// --- Département boundary, for the map only ---------------------------------------------------
const boundary = elements.find((e) => e.type === "relation" && tags(e).boundary === "administrative");
const outers = (boundary?.members ?? []).filter((m) => m.type === "way" && m.role !== "inner").map((m) => wayCoords(m.geometry));
const border = psqlJson(`
SELECT json_build_object('name', ${sqlText(tags(boundary ?? {}).name ?? code)},
  'shape', ST_AsGeoJSON(ST_SimplifyPreserveTopology(ST_LineMerge(ST_SetSRID(ST_GeomFromGeoJSON(${sqlText(
    JSON.stringify({ type: "MultiLineString", coordinates: outers }),
  )}), 4326)), 0.0001), 5)::json);`);

// --- Rail network of the app around the stations, as on the site map ---------------------------
const lons = out.map((s) => s.point[0]);
const lats = out.map((s) => s.point[1]);
const network = out.length
  ? psqlJson(`
WITH l AS (
  SELECT id, station_a, station_b, geom FROM rail_links
  WHERE geom && ST_MakeEnvelope(${Math.min(...lons) - 0.1}, ${Math.min(...lats) - 0.1}, ${Math.max(...lons) + 0.1}, ${Math.max(...lats) + 0.1}, 4326)
)
SELECT json_build_object(
  'stations', (SELECT coalesce(json_agg(json_build_object('id', p.id, 'name', COALESCE(p.custom_name, p.name), 'lon', ST_X(p.geom), 'lat', ST_Y(p.geom))), '[]')
    FROM places p WHERE p.id IN (SELECT station_a FROM l UNION SELECT station_b FROM l) OR p.id = ANY(ARRAY[${out.map((s) => s.id).join(",") || "NULL"}]::int[])),
  'links', (SELECT coalesce(json_agg(json_build_object('id', id, 'stations', json_build_array(station_a, station_b),
    'coords', (ST_AsGeoJSON(ST_Simplify(geom, 0.00001), 6)::json)->'coordinates')), '[]') FROM l)
);`)
  : { stations: [], links: [] };

writeFileSync(
  outPath,
  JSON.stringify({
    code,
    name: border.name,
    border: border.shape,
    railReach: RAIL_REACH,
    widenStep: WIDEN_STEP,
    widenMax: WIDEN_MAX,
    stations: out.map((s) => ({
      id: s.id,
      name: s.name,
      point: s.point,
      tile: s.tile,
      tileArea: s.tileArea,
      rails: s.rails,
      osmParts: s.features.geometries.length,
      plansSource: sources[s.id],
    })),
    zones,
    footprints,
    network,
  }),
);
const fromRails = out.filter((s) => sources[s.id] !== "osm").map((s) => `${s.name} (${sources[s.id]})`);
if (fromRails.length) console.log(`  Plans footprint without platforms nor buildings: ${fromRails.join(", ")}`);
console.log(`${code} ${border.name}: ${out.length} stations, ${out.filter((s) => s.rails.length).length} with tracks, ${zones.length} zones`);
