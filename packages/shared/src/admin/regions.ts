/** Kinds of the regions of the dataset; the subdivisions of the countries to come. */
export const ADMIN_REGION_KINDS = ["country"] as const;
export type AdminRegionKind = (typeof ADMIN_REGION_KINDS)[number];

/**
 * `GET /api/admin/regions` (all of them) and `/regions/:code`: a region of
 * the dataset, its figures read only. Its code is its id: ISO 3166-1
 * alpha-2 for a country (ISO 3166-2 for a subdivision, never alike).
 */
export interface AdminRegion {
  code: string;
  kind: AdminRegionKind;
  /** Members holding a large tile touching it. */
  visitors: number;
  /** Large tiles (zoom 14) and small tiles (zoom 17) touching it; null until computed. */
  totalTiles: number | null;
  totalSubtiles: number | null;
  /** Large and small tiles of the members touching it, every member together, each counted once. */
  visitedTiles: number;
  visitedSubtiles: number;
  /** When its totals and tile shape were computed; null while waiting for the worker. */
  computedAt: string | null;
  /** Last time a member looked at it as a sector while its totals were missing. */
  requestedAt: string | null;
  /** Stations in it, those visited by one member at least, and the length of railway in it. */
  stations: number;
  heldStations: number;
  railM: number;
  /** Length of its railway between two stations visited (by any members). */
  visitedRailM: number;
}

/** `GET /api/admin/regions`: every region, and the members, for the shares. */
export interface AdminRegionsList {
  regions: AdminRegion[];
  members: number;
}
