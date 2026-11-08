import type { CookieOptions, Request, Response } from 'express';

interface Envelope<T> {
  expiresAt: number;
  payload: T;
}

/**
 * Short-lived JSON cookie signed with the cookie-parser secret. Used to carry
 * OAuth state between redirects without server-side storage.
 */
export class SignedCookie<T> {
  constructor(
    private readonly name: string,
    private readonly ttlMs: number,
    private readonly path: string,
  ) {}

  write(response: Response, payload: T, secure: boolean): void {
    const envelope: Envelope<T> = {
      expiresAt: Date.now() + this.ttlMs,
      payload,
    };
    response.cookie(this.name, JSON.stringify(envelope), {
      ...this.options(secure),
      maxAge: this.ttlMs,
      signed: true,
    });
  }

  read(request: Request): T | null {
    const signedCookies = request.signedCookies as Record<string, unknown>;
    const raw = signedCookies[this.name];
    if (typeof raw !== 'string') {
      return null;
    }
    try {
      const envelope = JSON.parse(raw) as Envelope<T>;
      return envelope.expiresAt > Date.now() ? envelope.payload : null;
    } catch {
      return null;
    }
  }

  clear(response: Response, secure: boolean): void {
    response.clearCookie(this.name, this.options(secure));
  }

  private options(secure: boolean): CookieOptions {
    return { httpOnly: true, secure, sameSite: 'lax', path: this.path };
  }
}
