/** Networks of stations joined by links, grown station by station. */
class Networks {
  private readonly parent = new Map<number, number>();
  private readonly sizes = new Map<number, number>();
  /** Size of the largest network so far. */
  largest = 0;

  has(id: number): boolean {
    return this.parent.has(id);
  }

  add(id: number): void {
    if (this.has(id)) return;
    this.parent.set(id, id);
    this.sizes.set(id, 1);
    this.largest = Math.max(this.largest, 1);
  }

  /** Joins the networks of two stations already added. */
  join(a: number, b: number): void {
    const rootA = this.root(a);
    const rootB = this.root(b);
    if (rootA === rootB) return;
    const size = this.sizes.get(rootA)! + this.sizes.get(rootB)!;
    this.parent.set(rootA, rootB);
    this.sizes.set(rootB, size);
    this.largest = Math.max(this.largest, size);
  }

  root(id: number): number {
    let top = id;
    while (this.parent.get(top) !== top) top = this.parent.get(top)!;
    // Path compression: the next lookups go straight to the root.
    while (id !== top) {
      const next = this.parent.get(id)!;
      this.parent.set(id, top);
      id = next;
    }
    return top;
  }
}

/** The stations linked to each station. */
function neighborsOf(links: [number, number][]): Map<number, number[]> {
  const neighbors = new Map<number, number[]>();
  for (const [a, b] of links) {
    neighbors.set(a, [...(neighbors.get(a) ?? []), b]);
    neighbors.set(b, [...(neighbors.get(b) ?? []), a]);
  }
  return neighbors;
}

/**
 * The largest network of visited stations: the stations reached from one
 * another along links between two of them. A station without any link is a
 * network of its own. Ids sorted; none without stations; the first network
 * found wins a tie.
 */
export function largestStationCluster(
  stationIds: number[],
  links: [number, number][],
): number[] {
  const networks = new Networks();
  for (const id of stationIds) networks.add(id);
  for (const [a, b] of links) {
    if (networks.has(a) && networks.has(b)) networks.join(a, b);
  }

  const members = new Map<number, number[]>();
  let largest: number[] = [];
  for (const id of stationIds) {
    const top = networks.root(id);
    let group = members.get(top);
    if (!group) {
      group = [];
      members.set(top, group);
    }
    group.push(id);
    if (group.length > largest.length) largest = group;
  }
  return [...largest].sort((a, b) => a - b);
}

/** The first visit of a station: the activity that reached it first. */
export interface StationFirstVisit {
  stationId: number;
  activityId: string;
}

/** What an activity brought to the stations. */
export interface StationGain {
  activityId: string;
  /** Stations reached for the first time. */
  stations: number;
  /** Growth of the largest network. */
  maxCluster: number;
}

/**
 * Replays the first visits, in the order of their activities, to tell what
 * each activity brought: its new stations, joined to the stations reached
 * before them, and the growth of the largest network.
 */
export function replayStationGains(
  firstVisits: StationFirstVisit[],
  links: [number, number][],
): StationGain[] {
  const neighbors = neighborsOf(links);
  const networks = new Networks();
  const gains: StationGain[] = [];
  for (const { stationId, activityId } of firstVisits) {
    let gain = gains.at(-1);
    if (gain?.activityId !== activityId) {
      gain = { activityId, stations: 0, maxCluster: 0 };
      gains.push(gain);
    }
    const before = networks.largest;
    networks.add(stationId);
    for (const neighbor of neighbors.get(stationId) ?? []) {
      if (networks.has(neighbor)) networks.join(stationId, neighbor);
    }
    gain.stations += 1;
    gain.maxCluster += networks.largest - before;
  }
  return gains;
}
