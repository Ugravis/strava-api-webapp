import { metersBetween, type StationCandidate } from './railway-data';
import type { NetworkLink } from './railway-network';

/**
 * A tourist network whose farthest stations are this close is a park
 * train (Chanteraines); farther, a real line from A to B (the Cévennes).
 */
export const PARK_EXTENT_M = 4_000;
/**
 * A park train stops every few hundred metres; a shuttle or a mountain
 * railway (Langeoog, the Puy de Dôme) runs farther than this between stops.
 */
export const PARK_SPACING_M = 1_500;
/** A network of more stations than this is never a park train. */
const PARK_MAX_STATIONS = 100;

/**
 * Excludes the kept stations no train takes anyone to: those of a park
 * network (`park`, see `isParkNetwork`), then those linked to no other
 * station (`unlinked`).
 * Returns the links kept.
 */
export function pruneStations(
  stations: StationCandidate[],
  links: NetworkLink[],
): NetworkLink[] {
  const parent = new Map<number, number>();
  const root = (station: number): number => {
    let current = station;
    while (parent.has(current)) current = parent.get(current)!;
    return current;
  };
  for (const { a, b } of links) {
    const [ra, rb] = [root(a), root(b)];
    if (ra !== rb) parent.set(ra, rb);
  }
  const networks = new Map<
    number,
    { members: Set<number>; links: NetworkLink[] }
  >();
  for (const link of links) {
    const key = root(link.a);
    const network = networks.get(key) ?? { members: new Set(), links: [] };
    network.members.add(link.a).add(link.b);
    network.links.push(link);
    networks.set(key, network);
  }
  const park = new Set<number>();
  for (const { members, links: own } of networks.values()) {
    const list = [...members];
    if (
      isParkNetwork(
        list.map((station) => stations[station]),
        own,
      )
    ) {
      for (const station of list) park.add(station);
    }
  }
  for (const station of park) stations[station].exclusion = 'park';
  const kept = links.filter(({ a }) => !park.has(a));
  const linked = new Set(kept.flatMap(({ a, b }) => [a, b]));
  stations.forEach((station, index) => {
    if (station.exclusion === null && !linked.has(index))
      station.exclusion = 'unlinked';
  });
  return kept;
}

/**
 * Whether linked stations are a park train: all tourist ones, within
 * `PARK_EXTENT_M` of each other and `PARK_SPACING_M` of the next one.
 */
export function isParkNetwork(
  stations: StationCandidate[],
  links: NetworkLink[],
): boolean {
  if (stations.length > PARK_MAX_STATIONS) return false;
  if (!stations.every((station) => station.tourist)) return false;
  if (links.some((link) => link.lengthM >= PARK_SPACING_M)) return false;
  return stations.every((a, i) =>
    stations
      .slice(i + 1)
      .every((b) => metersBetween(a.point, b.point) < PARK_EXTENT_M),
  );
}
