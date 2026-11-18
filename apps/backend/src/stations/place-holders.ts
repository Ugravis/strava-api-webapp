/**
 * Counts again the accounts holding each place, a small tile of its zone
 * visited: after an import of the stations, whose zones change. Kept up to
 * date in between by `refresh_user_tiles` and the deletion of the accounts.
 */
export const COUNT_PLACE_HOLDERS = `UPDATE places p SET holders = COALESCE(n.holders, 0)
  FROM places q
  LEFT JOIN (
    SELECT t.place_id, count(DISTINCT u.user_id)::int AS holders
    FROM place_tiles t
    JOIN user_tiles u ON u.x = t.x AND u.y = t.y AND u.mask & (1::bigint << t.bit) <> 0
    GROUP BY t.place_id
  ) n ON n.place_id = q.id
  WHERE p.id = q.id AND p.holders IS DISTINCT FROM COALESCE(n.holders, 0)`;
