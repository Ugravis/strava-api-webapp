import { validateEnvironment } from './environment.validation';

const secret = 'a'.repeat(32);
const production = {
  NODE_ENV: 'production',
  FRONTEND_URL: 'https://kilotrace.app',
  COOKIE_SECRET: secret,
  ENCRYPTION_SECRET: secret,
  STRAVA_WEBHOOK_VERIFY_TOKEN: secret,
  DB_PASSWORD: 'db-password',
  S3_ACCESS_KEY: 's3-access-key',
  S3_SECRET_KEY: 's3-secret-key',
};

describe('validateEnvironment', () => {
  it('accepts an empty development environment', () => {
    expect(() => validateEnvironment({})).not.toThrow();
  });

  it('accepts a complete production environment', () => {
    expect(validateEnvironment(production)).toBe(production);
  });

  it('rejects missing secrets in production', () => {
    expect(() =>
      validateEnvironment({ ...production, COOKIE_SECRET: undefined }),
    ).toThrow('COOKIE_SECRET must be set');
  });

  it('rejects the development defaults in production', () => {
    expect(() =>
      validateEnvironment({ ...production, DB_PASSWORD: 'postgres' }),
    ).toThrow('DB_PASSWORD must be set to a non-default value');
  });

  it('rejects short secrets in production', () => {
    expect(() =>
      validateEnvironment({ ...production, ENCRYPTION_SECRET: 'short' }),
    ).toThrow('ENCRYPTION_SECRET must be at least 32 characters long');
  });

  it('rejects a plain http frontend in production', () => {
    expect(() =>
      validateEnvironment({
        ...production,
        FRONTEND_URL: 'http://kilotrace.app',
      }),
    ).toThrow('FRONTEND_URL must be an https:// URL');
  });

  it('rejects a verify token that cannot be a URL segment', () => {
    expect(() =>
      validateEnvironment({ STRAVA_WEBHOOK_VERIFY_TOKEN: 'a/b' }),
    ).toThrow('STRAVA_WEBHOOK_VERIFY_TOKEN may only contain');
  });
});
