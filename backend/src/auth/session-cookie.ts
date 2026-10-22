import { Inject, Injectable } from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import authConfig, { type AuthConfig } from '../config/auth.config';
import type { CreatedSession } from './sessions/sessions.service';

export const SESSION_COOKIE = 'session';

@Injectable()
export class SessionCookie {
  constructor(@Inject(authConfig.KEY) private readonly config: AuthConfig) {}

  read(request: Request): string | null {
    const cookies = request.cookies as Record<string, string | undefined>;
    return cookies[SESSION_COOKIE] ?? null;
  }

  /** A non-persistent session gets a browser-session cookie (no expiry date). */
  write(response: Response, session: CreatedSession): void {
    response.cookie(SESSION_COOKIE, session.token, {
      ...this.options(),
      expires: session.persistent ? session.expiresAt : undefined,
    });
  }

  clear(response: Response): void {
    response.clearCookie(SESSION_COOKIE, this.options());
  }

  private options(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.config.secureCookies,
      sameSite: 'lax',
      path: '/',
    };
  }
}
