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
 * Attaches the dependencies (overseas regions, territories) to their
 * sovereign country: La Réunion counts for France, Greenland for Denmark.
 */
export function toCountryAreas(
  areas: OvertureArea[],
  sovereignByDivision: Map<string, string>,
): CountryArea[] {
  return areas.map((area) => ({
    code: sovereignByDivision.get(area.divisionId) ?? area.country,
    wkb: area.wkb,
  }));
}
