/** Land area of a country or of a dependency, as read from Overture Maps. */
export interface OvertureArea {
  /** ISO 3166-1 alpha-2 code of the area itself (e.g. `RE` for La Réunion). */
  country: string;
  /** Overture division the area belongs to. */
  divisionId: string;
  /** Polygon or MultiPolygon, WGS 84, as WKB. */
  wkb: Uint8Array;
}

/** Land area attached to its sovereign country. */
export interface CountryArea {
  code: string;
  wkb: Uint8Array;
}

/**
 * Dependencies counted as countries of their own: vast and self-governing,
 * they would outweigh their sovereign country (Greenland holds about 99 %
 * of the tiles of Denmark).
 */
export const SEPARATE_DEPENDENCIES = new Set(['GL']);

/**
 * Attaches the dependencies (overseas regions, territories) to their
 * sovereign country, La Réunion to France, except the separate ones.
 */
export function toCountryAreas(
  areas: OvertureArea[],
  sovereignByDivision: Map<string, string>,
): CountryArea[] {
  return areas.map((area) => ({
    code: SEPARATE_DEPENDENCIES.has(area.country)
      ? area.country
      : (sovereignByDivision.get(area.divisionId) ?? area.country),
    wkb: area.wkb,
  }));
}
