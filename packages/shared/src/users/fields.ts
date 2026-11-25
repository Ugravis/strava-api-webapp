/**
 * Lengths of the account fields, enforced alike by the forms of the site,
 * of the back office and by the API.
 */

/** RFC 5321: a deliverable address never exceeds 254 characters. */
export const EMAIL_MAX_LENGTH = 254;

/** NIST SP 800-63B: no composition rule, only a length and a blocklist. */
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

export const DISPLAY_NAME_MIN_LENGTH = 1;
export const DISPLAY_NAME_MAX_LENGTH = 50;
export const BIO_MAX_LENGTH = 160;
export const CITY_MAX_LENGTH = 60;
export const PROFILE_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

/** A password as hashed: Unicode normalized (NFKC), so one typed on any device matches. */
export function normalizePassword(password: string): string {
  return password.normalize("NFKC");
}

/** Length in characters (code points), not UTF-16 units: an emoji counts once. */
export function passwordLength(password: string): number {
  return [...normalizePassword(password)].length;
}
