/**
 * `GET /api/admin/map/version`: part of the URLs of the tiles of the map of
 * the back office, changing with the data they hold.
 */
export interface AdminMapVersion {
  /** The stations and the railway: each import, and each change of a station. */
  stations: string;
  /** The countries: each import of their borders, and each computation of their tile shapes. */
  countries: string;
}

/** `GET /api/admin/map/station/:id`: where a station of the map lies, to ring and center it. */
export interface AdminMapStation {
  id: number;
  name: string | null;
  lon: number;
  lat: number;
  /** Bounds of its zone (its small tiles), in degrees; null without any. */
  bounds: { west: number; south: number; east: number; north: number } | null;
}
