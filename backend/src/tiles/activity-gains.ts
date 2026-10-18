import { SUBTILE_ZOOM, TILE_ZOOM } from './tile-grid';
import type { TilePoint } from './tile-metrics';

const SUBTILES_PER_SIDE = 2 ** (SUBTILE_ZOOM - TILE_ZOOM);
/** Tile coordinates stay below 2^17: a pair fits in one safe integer. */
const KEY_BASE = 2 ** 18;

const keyOf = (x: number, y: number) => y * KEY_BASE + x;

const NEIGHBORS: TilePoint[] = [
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
];

/** What one activity brought to one level of tiles, when it was recorded. */
export interface LevelGains {
  /** Tiles no earlier activity had crossed. */
  gained: TilePoint[];
  /** Growth of the largest cluster. */
  maxCluster: number;
  /** Tiles that became cluster tiles outside of the largest cluster. */
  otherClusters: number;
}

export interface ActivityGains {
  /** Large tiles (zoom 14). */
  tiles: LevelGains;
  /** Small tiles (zoom 17). */
  subtiles: LevelGains;
}

/**
 * Visited tiles of one level and their clusters, as activities are added in
 * the order they were recorded. Tiles are only ever added: the cluster
 * tiles, visited tiles whose four neighbors are visited too, are grouped
 * with a union-find, which keeps the largest cluster at each step.
 */
export class ClusterHistory {
  private readonly visited = new Set<number>();
  /** Cluster tiles, each with its parent in its group. */
  private readonly parent = new Map<number, number>();
  private readonly size = new Map<number, number>();
  private maxSize = 0;
  private maxRoot = -1;

  /** Adds the tiles of the next activity and returns what it brought. */
  add(points: TilePoint[]): LevelGains {
    const gained: TilePoint[] = [];
    for (const [x, y] of points) {
      const key = keyOf(x, y);
      if (!this.visited.has(key)) {
        this.visited.add(key);
        gained.push([x, y]);
      }
    }
    const maxBefore = this.maxSize;
    const joined: number[] = [];
    // Only a new tile and its neighbors can become cluster tiles.
    for (const [x, y] of gained) {
      this.join(x, y, joined);
      for (const [dx, dy] of NEIGHBORS) this.join(x + dx, y + dy, joined);
    }
    const maxRoot = this.maxRoot >= 0 ? this.find(this.maxRoot) : -1;
    return {
      gained,
      maxCluster: this.maxSize - maxBefore,
      otherClusters: joined.filter((key) => this.find(key) !== maxRoot).length,
    };
  }

  /** Makes `(x, y)` a cluster tile if it just became one, and groups it with its neighbors. */
  private join(x: number, y: number, joined: number[]): void {
    const key = keyOf(x, y);
    if (this.parent.has(key) || !this.visited.has(key)) return;
    if (!NEIGHBORS.every(([dx, dy]) => this.visited.has(keyOf(x + dx, y + dy))))
      return;
    this.parent.set(key, key);
    this.size.set(key, 1);
    joined.push(key);
    this.grow(key);
    for (const [dx, dy] of NEIGHBORS) {
      const neighbor = keyOf(x + dx, y + dy);
      if (this.parent.has(neighbor)) this.union(key, neighbor);
    }
  }

  private find(key: number): number {
    let root = key;
    for (
      let next = this.parent.get(root)!;
      next !== root;
      next = this.parent.get(root)!
    )
      root = next;
    // Path compression: the next searches go straight to the root.
    for (let node = key; node !== root;) {
      const next = this.parent.get(node)!;
      this.parent.set(node, root);
      node = next;
    }
    return root;
  }

  private union(a: number, b: number): void {
    let rootA = this.find(a);
    let rootB = this.find(b);
    if (rootA === rootB) return;
    if (this.size.get(rootA)! < this.size.get(rootB)!)
      [rootA, rootB] = [rootB, rootA];
    this.parent.set(rootB, rootA);
    this.size.set(rootA, this.size.get(rootA)! + this.size.get(rootB)!);
    this.size.delete(rootB);
    this.grow(rootA);
  }

  /** Keeps the largest group: groups only grow. */
  private grow(root: number): void {
    const size = this.size.get(root)!;
    if (size > this.maxSize) {
      this.maxSize = size;
      this.maxRoot = root;
    }
  }
}

/** Large tiles crossed by one activity, with the small tiles crossed in each. */
export interface ActivityCells {
  xs: number[];
  ys: number[];
  masks: bigint[];
}

/** Small tiles of large tiles and their masks. */
function subtilePoints({ xs, ys, masks }: ActivityCells): TilePoint[] {
  const points: TilePoint[] = [];
  xs.forEach((x, i) => {
    for (let bit = 0; bit < SUBTILES_PER_SIDE ** 2; bit++) {
      if ((masks[i] >> BigInt(bit)) & 1n) {
        points.push([
          x * SUBTILES_PER_SIDE + (bit % SUBTILES_PER_SIDE),
          ys[i] * SUBTILES_PER_SIDE + Math.floor(bit / SUBTILES_PER_SIDE),
        ]);
      }
    }
  });
  return points;
}

/** What each activity brought, the activities given in the order they were recorded. */
export function activityGains(activities: ActivityCells[]): ActivityGains[] {
  const tiles = new ClusterHistory();
  const subtiles = new ClusterHistory();
  return activities.map((cells) => ({
    // A large tile without any small tile crossed is not visited, as in the metrics.
    tiles: tiles.add(
      cells.xs.flatMap((x, i): TilePoint[] =>
        cells.masks[i] !== 0n ? [[x, cells.ys[i]]] : [],
      ),
    ),
    subtiles: subtiles.add(subtilePoints(cells)),
  }));
}
