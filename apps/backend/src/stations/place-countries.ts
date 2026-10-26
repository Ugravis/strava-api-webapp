/**
 * Places on the coast may fall just outside the land of every country: they
 * belong to the nearest one within this distance, in Web Mercator meters.
 */
export const PLACE_COAST_TOLERANCE_M = 2_000;

/** Sets the country of every place: the one holding it, else the nearest one along the coast. */
export const LOCATE_PLACES = `UPDATE places p SET country_code = (
  SELECT c.country_code FROM country_parts c
  WHERE ST_DWithin(c.geom, ST_Transform(p.geom, 3857), ${PLACE_COAST_TOLERANCE_M})
  ORDER BY c.geom <-> ST_Transform(p.geom, 3857)
  LIMIT 1
)`;
