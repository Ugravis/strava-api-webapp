import type { VisitedStations } from "@kilotrace/ui/lib/api/types";
import { type LinkEnd, NO_STATION_DATA, type StationData } from "@kilotrace/ui/lib/map/stations-layer";
import type { MapHistory } from "./history-layer";

/** Whether a station or a link was gained in the period of the history: drawn in the pink of the gains. */
interface Gained {
  gained?: boolean;
}

/** Whether a first visit falls in the period of the history; a visit not dated yet counts as an old one. */
function isGained(
  firstVisitAt: string | null,
  history: MapHistory | null,
): boolean {
  return (
    history !== null && firstVisitAt !== null && firstVisitAt >= history.instant
  );
}

/** Whether a first visit counts for the history: the map as it was then, or all of it with the gains apart. */
function inHistory(
  firstVisitAt: string | null,
  history: MapHistory | null,
): boolean {
  return history?.mode !== "state" || !isGained(firstVisitAt, history);
}

/** The earlier features first: the gained ones are drawn over them. */
function gainedLast<T extends { properties: Gained }>(features: T[]): T[] {
  return features.sort(
    (a, b) =>
      Number(a.properties.gained ?? false) -
      Number(b.properties.gained ?? false),
  );
}

/**
 * The visited stations and the links between them, as of the history when
 * open, or all of them with the gains apart: a link is unlocked by the later
 * of the first visits of its stations.
 */
export function stationData(
  visited: VisitedStations | null,
  history: MapHistory | null,
): StationData {
  if (!visited) return NO_STATION_DATA;
  const firstVisits = new Map<number, string | null>();
  const ends = new Map<number, LinkEnd>();
  const features: StationData["stations"]["features"] = [];
  for (const station of visited.stations) {
    if (!inHistory(station.firstVisitAt, history)) continue;
    firstVisits.set(station.id, station.firstVisitAt);
    ends.set(station.id, {
      id: station.id,
      name: station.name,
      lon: station.lon,
      lat: station.lat,
    });
    features.push({
      type: "Feature",
      id: station.id,
      properties: {
        id: station.id,
        name: station.name,
        gained: isGained(station.firstVisitAt, history),
      },
      geometry: { type: "Point", coordinates: [station.lon, station.lat] },
    });
  }
  const links: StationData["links"]["features"] = [];
  const unlockedAts = new Map<number, string | null>();
  for (const link of visited.links) {
    const [a, b] = link.stations.map((id) => firstVisits.get(id));
    if (a === undefined || b === undefined) continue;
    const unlockedAt = a === null || b === null ? (a ?? b) : a > b ? a : b;
    if (!inHistory(unlockedAt, history)) continue;
    unlockedAts.set(link.id, unlockedAt);
    const [first, second] = link.stations.map((id) => ends.get(id)!);
    // The station nearest the first point starts the link.
    const [lon, lat] = link.coords[0];
    const startsAtFirst =
      Math.hypot(first.lon - lon, first.lat - lat) <=
      Math.hypot(second.lon - lon, second.lat - lat);
    links.push({
      type: "Feature",
      id: link.id,
      properties: {
        ...(startsAtFirst
          ? { start: first, end: second }
          : { start: second, end: first }),
        gained: isGained(unlockedAt, history),
      },
      geometry: { type: "LineString", coordinates: link.coords },
    });
  }
  const ties: StationData["ties"]["features"] = [];
  for (const tie of visited.ties) {
    // Shown from the first link in the history over it.
    const inPeriod = tie.linkIds.filter((id) => unlockedAts.has(id));
    if (inPeriod.length === 0) continue;
    const ats = inPeriod.map((id) => unlockedAts.get(id) ?? null);
    const first = ats.includes(null) ? null : (ats as string[]).reduce((a, b) => (a < b ? a : b));
    ties.push({
      type: "Feature",
      properties: { gained: isGained(first, history) },
      geometry: { type: "LineString", coordinates: tie.coords },
    });
  }
  return {
    stations: { type: "FeatureCollection", features: gainedLast(features) },
    links: { type: "FeatureCollection", features: gainedLast(links) },
    ties: { type: "FeatureCollection", features: gainedLast(ties) },
  };
}

