import type { FieldRules } from "../rules";

/** Longest name given to a station by the team. */
export const ADMIN_STATION_NAME_MAX_LENGTH = 120;

/** What the zone of a station comes from: its footprint in OpenStreetMap, the tracks around it, or its point alone. */
export const ADMIN_STATION_ZONE_SOURCES = ["osm", "rails", "point"] as const;
export type AdminStationZoneSource = (typeof ADMIN_STATION_ZONE_SOURCES)[number];

/** What OpenStreetMap calls it (`railway=*`): a station, or a halt without staff nor switches. */
export const ADMIN_STATION_CATEGORIES = ["station", "halt"] as const;
export type AdminStationCategory = (typeof ADMIN_STATION_CATEGORIES)[number];

/** `GET /api/admin/stations/table`: a train station of the dataset. */
export interface AdminStation {
  /** Id of the place, as text: the id of its row. */
  id: string;
  /** The name shown on the site: the one given by the team, else the one of OpenStreetMap. */
  name: string | null;
  /** The name of OpenStreetMap, refreshed by every import. */
  osmName: string | null;
  /** The name given by the team, kept over the imports; null for the one of OpenStreetMap. */
  customName: string | null;
  /** Hidden from the site (map, visits, figures) by the team, kept over the imports. */
  hiddenAt: string | null;
  /** `n`, `w` or `r`, then its id in OpenStreetMap. */
  osmType: string;
  osmId: string;
  countryCode: string | null;
  lon: number;
  lat: number;
  zoneSource: AdminStationZoneSource;
  /** Small tiles (zoom 17) of its zone. */
  zoneTiles: number;
  /** Stations linked to it by the railway, and the length of these links. */
  links: number;
  linksM: number;
  /** Accounts that visited a small tile of its zone. */
  holders: number;
  category: AdminStationCategory;
  /** A tourist or heritage train, by its tags, routes or track. */
  tourist: boolean;
  /** Train routes stopping at the station or in its stop areas: its importance. */
  routes: number;
  operator: string | null;
  /** The network of OpenStreetMap (`network`), e.g. a regional service. */
  network: string | null;
  /** Code of the station for the railways (`uic_ref`). */
  uicRef: string | null;
  /** Wikidata item (`Q…`). */
  wikidata: string | null;
  /** Last import or change of the team on it. */
  updatedAt: string;
}

/** `GET /api/admin/stations/:id/neighbors`: a station linked to another one by the railway. */
export interface AdminStationNeighbor {
  id: string;
  name: string | null;
  countryCode: string | null;
  lengthM: number;
  holders: number;
  hidden: boolean;
}

/**
 * `GET /api/admin/stations/:id/railway`: the station and those linked to it
 * by the railway, the links between them drawn along the tracks, the railway
 * under them cut where they diverge (drawn once for its ties), as the public
 * map draws them.
 */
export interface AdminStationRailway {
  stations: { id: number; name: string | null; lon: number; lat: number }[];
  links: { id: number; stations: [number, number]; lengthM: number; coords: [number, number][] }[];
  ties: { linkIds: number[]; coords: [number, number][] }[];
}

/** `GET /api/admin/stations/overview`: the figures above the table. */
export interface AdminStationsOverview {
  total: number;
  /** Stations visited by one account at least. */
  held: number;
  hidden: number;
  renamed: number;
  zoneSources: Record<AdminStationZoneSource, number>;
  /** Countries holding stations, most stations first. */
  countries: { code: string; stations: number }[];
  /** Stations out of every country. */
  withoutCountry: number;
  links: number;
  linksKm: number;
  /** The station visited by the most accounts. */
  top: { id: string; name: string | null; holders: number } | null;
  /** Accounts with one station visited at least. */
  collectors: number;
  lastImportAt: string | null;
}

/** `PATCH /api/admin/stations/:id`: its name for the site, null to take the one of OpenStreetMap again. */
export interface RenameStationRequest {
  name: string | null;
}

/** `PUT /api/admin/stations/:id/hidden`: hidden from the site or shown again, `reason` kept in the log. */
export interface HideStationRequest {
  hidden: boolean;
  reason?: string;
}

/** The rules of a station, followed by the back office as typed and by the API. */
export const STATION_RULES: FieldRules<RenameStationRequest> = {
  name: { type: "text", maxLength: ADMIN_STATION_NAME_MAX_LENGTH },
};
