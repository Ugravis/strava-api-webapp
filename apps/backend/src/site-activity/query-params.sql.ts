/**
 * A value naming one row (tile, activity, station…): too many of them to
 * count apart. Short numbers stay, as a period or a shown layer.
 */
const ID_VALUE = '^[0-9]{4,}$|^[0-9a-f]{8}-[0-9a-f]{4}-|/|%2F';

/** Key of a `key=value` pair of a query string. */
export const paramKeySql = (pair: string) =>
  `left(split_part(${pair}, '=', 1), 100)`;

/** Its value, raw. */
export const paramRawValueSql = (pair: string) => `split_part(${pair}, '=', 2)`;

/** Its value, those of an id gathered as `[id]`. */
export const paramValueSql = (pair: string) =>
  `CASE WHEN ${paramRawValueSql(pair)} ~* '${ID_VALUE}' THEN '[id]' ELSE left(${paramRawValueSql(pair)}, 200) END`;

/** The `key=value` pairs of a query string column, as a set-returning call. */
export const paramPairsSql = (query: string) =>
  `unnest(string_to_array(${query}, '&'))`;
