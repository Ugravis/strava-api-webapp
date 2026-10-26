import { ADMIN_SESSION_COOKIE, AdminRole } from '@kilotrace/shared';
import { Get, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import type { App } from 'supertest/types';
import type { AuditEntry } from '../src/admin/audit/audit-log.service';
import { AuditLogService } from '../src/admin/audit/audit-log.service';
import { AuditInterceptor } from '../src/admin/audit/audit.interceptor';
import {
  ADMIN_GOOGLE_OAUTH,
  AdminAuthController,
} from '../src/admin/auth/admin-auth.controller';
import { AdminAuthService } from '../src/admin/auth/admin-auth.service';
import { AdminController } from '../src/admin/decorators/admin-controller.decorator';
import { AdminPublic } from '../src/admin/decorators/admin-public.decorator';
import { AdminGuard } from '../src/admin/guards/admin.guard';
import { AdminSessionsService } from '../src/admin/sessions/admin-sessions.service';
import type { AdminUser } from '../src/admin/users/admin-user.entity';
import { API_PREFIX } from '../src/common/api-prefix';
import adminAuthConfig from '../src/config/admin-auth.config';

@AdminController('public-probe')
class PublicProbeController {
  @AdminPublic()
  @Get()
  read(): string {
    return 'public';
  }

  @AdminPublic()
  @Post()
  write(): string {
    return 'written';
  }
}

const ADMIN_URL = 'http://admin.test';
const GOOGLE_URL = 'https://accounts.google.test/authorize';

describe('Admin sign-in (e2e)', () => {
  let app: INestApplication<App>;
  let auditEntries: AuditEntry[];
  const oauth = {
    isEnabled: true,
    createAuthorizationRequest: jest.fn(),
    exchangeCode: jest.fn(),
  };
  const adminAuth = { signIn: jest.fn() };
  const sessions = { validate: jest.fn(), revoke: jest.fn() };

  beforeAll(async () => {
    auditEntries = [];
    const moduleRef = await Test.createTestingModule({
      controllers: [AdminAuthController, PublicProbeController],
      providers: [
        { provide: APP_GUARD, useClass: AdminGuard },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
        { provide: ADMIN_GOOGLE_OAUTH, useValue: oauth },
        { provide: AdminAuthService, useValue: adminAuth },
        { provide: AdminSessionsService, useValue: sessions },
        {
          provide: AuditLogService,
          useValue: {
            record: (entry: AuditEntry) => {
              auditEntries.push(entry);
              return Promise.resolve();
            },
          },
        },
        {
          provide: adminAuthConfig.KEY,
          useValue: { adminUrl: ADMIN_URL, secureCookies: false },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.use(cookieParser('test-cookie-secret'));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    jest.resetAllMocks();
    oauth.isEnabled = true;
    oauth.createAuthorizationRequest.mockResolvedValue({
      url: GOOGLE_URL,
      state: 'expected-state',
      codeVerifier: 'verifier',
    });
    oauth.exchangeCode.mockResolvedValue({
      email: 'boss@example.com',
      emailVerified: true,
    });
    auditEntries.length = 0;
  });

  /** Starts the flow and returns an agent carrying the signed state cookie. */
  async function startedAgent() {
    const agent = request.agent(app.getHttpServer());
    await agent
      .get('/api/admin/auth/google')
      .expect(302)
      .expect('Location', GOOGLE_URL);
    return agent;
  }

  const sessionCookieOf = (response: request.Response) =>
    ([] as string[])
      .concat(response.headers['set-cookie'] ?? [])
      .find((cookie) => cookie.startsWith(`${ADMIN_SESSION_COOKIE}=`));

  describe('Google sign-in', () => {
    it('sends back to the sign-in page when the dedicated client is not configured', () => {
      oauth.isEnabled = false;
      return request(app.getHttpServer())
        .get('/api/admin/auth/google')
        .expect(302)
        .expect('Location', `${ADMIN_URL}/login?error=google_disabled`);
    });

    it('refuses a callback without the state cookie', () =>
      request(app.getHttpServer())
        .get('/api/admin/auth/google/callback?code=code&state=expected-state')
        .expect(302)
        .expect('Location', `${ADMIN_URL}/login?error=google`));

    it('refuses a callback with another state', async () => {
      const agent = await startedAgent();
      await agent
        .get('/api/admin/auth/google/callback?code=code&state=forged')
        .expect(302)
        .expect('Location', `${ADMIN_URL}/login?error=google`);
      expect(adminAuth.signIn).not.toHaveBeenCalled();
    });

    it('refuses an account outside the allowlist without a session cookie', async () => {
      adminAuth.signIn.mockResolvedValue(null);
      const agent = await startedAgent();

      const response = await agent
        .get('/api/admin/auth/google/callback?code=code&state=expected-state')
        .expect(302)
        .expect('Location', `${ADMIN_URL}/login?error=not_allowed`);

      expect(oauth.exchangeCode).toHaveBeenCalledWith('code', 'verifier');
      expect(sessionCookieOf(response)).toBeUndefined();
    });

    it('reports a failed exchange with Google', async () => {
      oauth.exchangeCode.mockRejectedValue(new Error('invalid_grant'));
      const agent = await startedAgent();
      await agent
        .get('/api/admin/auth/google/callback?code=code&state=expected-state')
        .expect(302)
        .expect('Location', `${ADMIN_URL}/login?error=google`);
    });

    it('sets a host-only, browser-session cookie for an allowlisted account', async () => {
      adminAuth.signIn.mockResolvedValue({
        token: 'session-token',
        expiresAt: new Date(),
      });
      const agent = await startedAgent();

      const response = await agent
        .get('/api/admin/auth/google/callback?code=code&state=expected-state')
        .expect(302)
        .expect('Location', `${ADMIN_URL}/`);

      const cookie = sessionCookieOf(response);
      expect(cookie).toMatch(/^kilotrace_admin_session=session-token;/);
      expect(cookie).toMatch(/HttpOnly/);
      expect(cookie).toMatch(/SameSite=Lax/);
      expect(cookie).not.toMatch(/Domain=|Expires=|Max-Age=/);
    });
  });

  describe('sign-out', () => {
    it('requires a session', () =>
      request(app.getHttpServer())
        .post('/api/admin/auth/sign-out')
        .expect(401));

    it('revokes the session, clears the cookie and records it', async () => {
      sessions.validate.mockResolvedValue({
        admin: { id: 'admin-id', role: AdminRole.Support } as AdminUser,
        session: { id: 'session-id' },
      });

      const response = await request(app.getHttpServer())
        .post('/api/admin/auth/sign-out')
        .set('Cookie', `${ADMIN_SESSION_COOKIE}=session-token`)
        .expect(204);

      expect(sessions.revoke).toHaveBeenCalledWith('session-token');
      expect(sessionCookieOf(response)).toMatch(
        /^kilotrace_admin_session=;.*Expires=Thu, 01 Jan 1970/,
      );
      expect(auditEntries).toEqual([
        expect.objectContaining({
          actorId: 'admin-id',
          action: 'admin-auth.sign-out',
          succeeded: true,
        }),
      ]);
    });
  });

  describe('@AdminPublic()', () => {
    it('opens a read-only route without a session', () =>
      request(app.getHttpServer()).get('/api/admin/public-probe').expect(200));

    it('never opens a state-changing route', () =>
      request(app.getHttpServer()).post('/api/admin/public-probe').expect(403));
  });
});
