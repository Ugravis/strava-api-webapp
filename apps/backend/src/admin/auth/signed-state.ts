import { createHmac, timingSafeEqual } from 'node:crypto';

const TTL_MS = 10 * 60 * 1000;

interface Envelope<T> {
  expiresAt: number;
  payload: T;
}

const sign = (data: string, secret: string): Buffer =>
  createHmac('sha256', secret).update(data).digest();

/**
 * Short-lived payload signed with the cookie secret, kept by the admin app
 * between the redirect to Google and its callback: the OAuth state of the
 * back office, without server-side storage.
 */
export function signState<T>(payload: T, secret: string): string {
  const envelope: Envelope<T> = { expiresAt: Date.now() + TTL_MS, payload };
  const data = Buffer.from(JSON.stringify(envelope)).toString('base64url');
  return `${data}.${sign(data, secret).toString('base64url')}`;
}

/** The payload of a state signed here and not expired, else null. */
export function verifyState<T>(signed: string, secret: string): T | null {
  const [data, signature, extra] = signed.split('.');
  if (!data || !signature || extra !== undefined) {
    return null;
  }
  const expected = sign(data, secret);
  const actual = Buffer.from(signature, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) {
    return null;
  }
  try {
    const envelope = JSON.parse(
      Buffer.from(data, 'base64url').toString(),
    ) as Envelope<T>;
    return envelope.expiresAt > Date.now() ? envelope.payload : null;
  } catch {
    return null;
  }
}
