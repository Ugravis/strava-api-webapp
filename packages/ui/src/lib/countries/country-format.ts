/** Decimals shown at least, on both levels of tiles. */
const MIN_PERCENT_DECIMALS = 2;
const MAX_PERCENT_DECIMALS = 6;

/**
 * Decimals of a share shown as a percentage: at least two, more for a tiny
 * share so that two significant digits remain (0.00096 % rather than 0.00 %).
 */
export function percentDecimals(share: number): number {
  const percent = share * 100;
  if (percent <= 0 || percent >= 1) return MIN_PERCENT_DECIMALS;
  const needed = 1 - Math.floor(Math.log10(percent));
  return Math.min(MAX_PERCENT_DECIMALS, Math.max(MIN_PERCENT_DECIMALS, needed));
}

/** Flag emoji of an ISO 3166-1 alpha-2 code, from its regional indicator symbols. */
export function countryFlag(code: string): string {
  return String.fromCodePoint(...[...code.toUpperCase()].map((letter) => 0x1f1e6 + letter.charCodeAt(0) - 65));
}

/** Name of a country in `locale`, or its code when unknown. */
export function countryName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames([locale], { type: "region" }).of(code) ?? code;
  } catch {
    return code;
  }
}
