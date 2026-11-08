/** Days of the series of the back office overviews. */
const DAYS = 30;

/** The last 30 UTC days, oldest first, as a `day` to join in a `FROM`. */
export const LAST_DAYS = `generate_series(
  date_trunc('day', now(), 'UTC') - interval '${DAYS - 1} days',
  date_trunc('day', now(), 'UTC'),
  interval '1 day'
) AS day`;
