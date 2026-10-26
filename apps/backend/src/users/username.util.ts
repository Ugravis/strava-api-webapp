export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 20;
export const USERNAME_PATTERN = /^[a-z0-9_]{3,20}$/;

const RESERVED_USERNAMES = new Set([
  'admin',
  'administrator',
  'api',
  'help',
  'login',
  'logout',
  'me',
  'profile',
  'register',
  'root',
  'settings',
  'support',
  'system',
]);

export function isReservedUsername(username: string): boolean {
  return RESERVED_USERNAMES.has(username);
}

/**
 * Derives a valid username candidate from the local part of an email address,
 * e.g. `Jean.Dupont+strava@gmail.com` becomes `jean_dupont`.
 */
export function usernameBaseFromEmail(email: string): string {
  const localPart = email.split('@')[0].split('+')[0];
  const base = localPart
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_|_$/g, '')
    .slice(0, USERNAME_MAX_LENGTH);

  if (base.length >= USERNAME_MIN_LENGTH) {
    return base;
  }
  return base ? `${base}_run` : 'runner';
}

/** Appends a numeric suffix while keeping the username within its maximum length. */
export function withNumericSuffix(base: string, suffix: number): string {
  const suffixText = String(suffix);
  return `${base.slice(0, USERNAME_MAX_LENGTH - suffixText.length)}${suffixText}`;
}
