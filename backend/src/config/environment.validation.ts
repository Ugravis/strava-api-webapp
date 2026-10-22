const MIN_SECRET_LENGTH = 32;

/** Values shipped in `.env.example` and `docker-compose.yml`, public by nature. */
const KNOWN_DEFAULTS = new Set([
  'postgres',
  'rustfsadmin',
  'development-cookie-secret',
  'development-encryption-secret',
  'development-webhook-verify-token',
]);

/** Secrets that must be long random strings in production. */
const STRONG_SECRETS = [
  'COOKIE_SECRET',
  'ENCRYPTION_SECRET',
  'STRAVA_WEBHOOK_VERIFY_TOKEN',
] as const;

/** Credentials of the bundled services, which only need to be non-default. */
const CREDENTIALS = ['DB_PASSWORD', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'] as const;

/** The verify token is also the last segment of the webhook callback URL. */
const URL_SAFE = /^[A-Za-z0-9_-]+$/;

/**
 * Rejects at startup a configuration that would silently fall back to the
 * public development defaults. Only enforced in production, where a missing
 * variable would otherwise expose signed cookies and encrypted tokens.
 */
export function validateEnvironment(
  env: Record<string, unknown>,
): Record<string, unknown> {
  const errors: string[] = [];
  const read = (name: string): string =>
    typeof env[name] === 'string' ? env[name] : '';

  const verifyToken = read('STRAVA_WEBHOOK_VERIFY_TOKEN');
  if (verifyToken && !URL_SAFE.test(verifyToken)) {
    errors.push(
      'STRAVA_WEBHOOK_VERIFY_TOKEN may only contain letters, digits, "-" and "_"',
    );
  }

  if (env.NODE_ENV === 'production') {
    for (const name of [...STRONG_SECRETS, ...CREDENTIALS]) {
      const value = read(name);
      if (!value || KNOWN_DEFAULTS.has(value)) {
        errors.push(`${name} must be set to a non-default value`);
      }
    }
    for (const name of STRONG_SECRETS) {
      const value = read(name);
      if (value && value.length < MIN_SECRET_LENGTH) {
        errors.push(
          `${name} must be at least ${MIN_SECRET_LENGTH} characters long`,
        );
      }
    }
    if (!read('FRONTEND_URL').startsWith('https://')) {
      errors.push('FRONTEND_URL must be an https:// URL');
    }
  }

  if (errors.length > 0) {
    throw new Error(`Invalid environment:\n- ${errors.join('\n- ')}`);
  }
  return env;
}
