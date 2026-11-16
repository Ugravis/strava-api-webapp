/*
 * What the site shows of the stations: those the team has not hidden, under
 * the name it gave them, else the one of OpenStreetMap. `alias` is the one
 * of the places in the query.
 */

/** A station shown on the site. */
export const shownStation = (alias = 'p'): string =>
  `${alias}.kind = 'station' AND ${alias}.hidden_at IS NULL`;

/** The name of a station on the site. */
export const stationName = (alias = 'p'): string =>
  `COALESCE(${alias}.custom_name, ${alias}.name)`;
