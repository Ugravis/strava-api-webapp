/**
 * Counts again the links of every station and their length (`stations.links`,
 * `links_m`), stored to sort the stations by them: after each import, once
 * the links are final (merges done). Writes only the stations that change.
 */
export const COUNT_STATION_LINKS = `UPDATE stations s SET links = COALESCE(n.links, 0), links_m = COALESCE(n.links_m, 0)
  FROM stations q
  LEFT JOIN (
    SELECT e.id, count(*)::int AS links, round(sum(l.length_m))::int AS links_m
    FROM rail_links l, unnest(ARRAY[l.station_a, l.station_b]) AS e(id)
    GROUP BY e.id
  ) n ON n.id = q.place_id
  WHERE s.place_id = q.place_id
    AND (s.links, s.links_m) IS DISTINCT FROM (COALESCE(n.links, 0), COALESCE(n.links_m, 0))`;
