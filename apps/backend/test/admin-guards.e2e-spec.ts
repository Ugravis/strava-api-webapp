import { AdminRole } from '@kilotrace/shared';
import { Controller, Get, Param, Post } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import type { Request } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AdminMeController } from '../src/admin/admin-me.controller';
import { ADMIN_SESSION_COOKIE } from '../src/admin/admin-session-cookie';
import type { AuditEntry } from '../src/admin/audit/audit-log.service';
import { AuditLogService } from '../src/admin/audit/audit-log.service';
import { AuditInterceptor } from '../src/admin/audit/audit.interceptor';
import { Audited } from '../src/admin/audit/audited.decorator';
import { AdminController } from '../src/admin/decorators/admin-controller.decorator';
import { Roles } from '../src/admin/decorators/roles.decorator';
import { AdminGuard } from '../src/admin/guards/admin.guard';
import { AdminSessionsService } from '../src/admin/sessions/admin-sessions.service';
import type { AdminUser } from '../src/admin/users/admin-user.entity';
import { Public } from '../src/auth/decorators/public.decorator';
import { SessionGuard } from '../src/auth/guards/session.guard';
import { SessionCookie } from '../src/auth/session-cookie';
import { SessionsService } from '../src/auth/sessions/sessions.service';
import { API_PREFIX } from '../src/common/api-prefix';
import { ApiErrorCode, ApiErrors } from '../src/common/api-error';

@AdminController('probe')
class ProbeController {
  @Get('support')
  @Roles(AdminRole.Support)
  support(): string {
    return 'support';
  }

  @Get('admin')
  @Roles(AdminRole.Admin)
  admin(): string {
    return 'admin';
  }

  @Get('super-admin')
  @Roles(AdminRole.SuperAdmin)
  superAdmin(): string {
    return 'super-admin';
  }

  @Get('no-role')
  noRole(): string {
    return 'no-role';
  }

  @Post('unaudited')
  @Roles(AdminRole.Support)
  unaudited(): string {
    return 'unaudited';
  }

  @Post('things/:id/delete')
  @Roles(AdminRole.Admin)
  @Audited({
    action: 'things.delete',
    target: { type: 'thing', param: 'id' },
    requireReason: true,
  })
  deleteThing(@Param('id') id: string): string {
    return id;
  }

  @Post('failing')
  @Roles(AdminRole.Support)
  @Audited({ action: 'things.fail' })
  failing(): never {
    throw ApiErrors.conflict(ApiErrorCode.NotFound, 'Failed on purpose');
  }
}

/** Misplaced under `/admin` without `@AdminController()`. */
@Controller('admin/rogue')
@Public()
class RogueController {
  @Get()
  rogue(): string {
    return 'rogue';
  }
}

/** A regular user route. */
@Controller('user-area')
class UserAreaController {
  @Get()
  userArea(): string {
    return 'user-area';
  }
}

/** Stands for the database: accounts are read on every validation. */
class FakeAdminStore {
  readonly accounts = new Map<string, AdminUser>();
  readonly tokens = new Map<string, string>();

  add(token: string, role: AdminRole): AdminUser {
    const admin = {
      id: `${token}-id`,
      email: `${token}@example.com`,
      role,
      disabledAt: null,
    } as AdminUser;
    this.accounts.set(admin.id, admin);
    this.tokens.set(token, admin.id);
    return admin;
  }

  validate(token: string) {
    const admin = this.accounts.get(this.tokens.get(token) ?? '');
    if (!admin || admin.disabledAt) {
      return Promise.resolve(null);
    }
    return Promise.resolve({ admin: { ...admin }, session: { id: token } });
  }
}

describe('Admin guards (e2e)', () => {
  let app: INestApplication<App>;
  let store: FakeAdminStore;
  let auditEntries: AuditEntry[];

  beforeAll(async () => {
    store = new FakeAdminStore();
    auditEntries = [];
    const moduleRef = await Test.createTestingModule({
      controllers: [
        AdminMeController,
        ProbeController,
        RogueController,
        UserAreaController,
      ],
      providers: [
        { provide: APP_GUARD, useClass: SessionGuard },
        { provide: APP_GUARD, useClass: AdminGuard },
        { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
        {
          provide: AdminSessionsService,
          useValue: { validate: (token: string) => store.validate(token) },
        },
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
          provide: SessionsService,
          useValue: { validate: () => Promise.resolve(null) },
        },
        {
          provide: SessionCookie,
          useValue: {
            read: (req: Request) =>
              (req.cookies as Record<string, string>).kilotrace_session ?? null,
          },
        },
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    app.use(cookieParser());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  beforeEach(() => {
    store.accounts.clear();
    store.tokens.clear();
    auditEntries.length = 0;
  });

  const as = (token: string) => `${ADMIN_SESSION_COOKIE}=${token}`;
  const get = (path: string, token?: string) => {
    const call = request(app.getHttpServer()).get(path);
    return token ? call.set('Cookie', as(token)) : call;
  };
  const post = (path: string, token: string, body?: object) =>
    request(app.getHttpServer()).post(path).set('Cookie', as(token)).send(body);

  describe('authentication', () => {
    it('refuses a request without a back-office session', () =>
      get('/api/admin/me').expect(401));

    it('refuses an unknown session token', () =>
      get('/api/admin/me', 'unknown').expect(401));

    it('does not accept a user session cookie', () =>
      request(app.getHttpServer())
        .get('/api/admin/me')
        .set('Cookie', 'kilotrace_session=user-token')
        .expect(401));

    it('returns the signed-in account', async () => {
      const admin = store.add('support', AdminRole.Support);
      await get('/api/admin/me', 'support')
        .expect(200)
        .expect({ id: admin.id, email: admin.email, role: 'support' });
    });

    it('does not open user routes with a back-office session', () => {
      store.add('super', AdminRole.SuperAdmin);
      return get('/api/user-area', 'super').expect(401);
    });
  });

  describe('role hierarchy', () => {
    it.each([
      [AdminRole.Support, 'support', 200],
      [AdminRole.Support, 'admin', 403],
      [AdminRole.Support, 'super-admin', 403],
      [AdminRole.Admin, 'support', 200],
      [AdminRole.Admin, 'admin', 200],
      [AdminRole.Admin, 'super-admin', 403],
      [AdminRole.SuperAdmin, 'support', 200],
      [AdminRole.SuperAdmin, 'admin', 200],
      [AdminRole.SuperAdmin, 'super-admin', 200],
    ])('%s on the %s route answers %i', (role, route, status) => {
      store.add('token', role);
      return get(`/api/admin/probe/${route}`, 'token').expect(status);
    });
  });

  describe('deny by default', () => {
    it('refuses a route without @Roles(), even to a super-admin', () => {
      store.add('super', AdminRole.SuperAdmin);
      return get('/api/admin/probe/no-role', 'super')
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({ code: 'ADMIN_FORBIDDEN' }),
        );
    });

    it('refuses a state-changing route without @Audited()', () => {
      store.add('super', AdminRole.SuperAdmin);
      return post('/api/admin/probe/unaudited', 'super').expect(403);
    });

    // Variants the router still matches to the same route.
    it.each(['/api/admin/rogue', '/api/ADMIN/rogue', '/api/admin/rogue/'])(
      'refuses %s, under /admin without @AdminController()',
      (path) => {
        store.add('super', AdminRole.SuperAdmin);
        return get(path, 'super').expect(403);
      },
    );
  });

  describe('immediate role changes', () => {
    it('applies a downgrade on the next request', async () => {
      const admin = store.add('token', AdminRole.Admin);
      await get('/api/admin/probe/admin', 'token').expect(200);

      admin.role = AdminRole.Support;

      await get('/api/admin/probe/admin', 'token').expect(403);
      await get('/api/admin/probe/support', 'token').expect(200);
    });

    it('signs out a disabled account on the next request', async () => {
      const admin = store.add('token', AdminRole.SuperAdmin);
      await get('/api/admin/me', 'token').expect(200);

      admin.disabledAt = new Date();

      await get('/api/admin/me', 'token').expect(401);
    });
  });

  describe('audit log', () => {
    it('requires a reason for a destructive action and records nothing without it', async () => {
      store.add('token', AdminRole.Admin);
      await post('/api/admin/probe/things/42/delete', 'token', {})
        .expect(400)
        .expect(({ body }) =>
          expect(body).toMatchObject({ code: 'REASON_REQUIRED' }),
        );
      await post('/api/admin/probe/things/42/delete', 'token', {
        reason: ' ',
      }).expect(400);
      expect(auditEntries).toEqual([]);
    });

    it('records who did what, on what, why, and the outcome', async () => {
      const admin = store.add('token', AdminRole.Admin);
      await post('/api/admin/probe/things/42/delete', 'token', {
        reason: '  Duplicate entry  ',
      }).expect(201);

      expect(auditEntries).toEqual([
        expect.objectContaining({
          actorId: admin.id,
          action: 'things.delete',
          targetType: 'thing',
          targetId: '42',
          reason: 'Duplicate entry',
          succeeded: true,
        }),
      ]);
    });

    it('records a failed action, then returns its error', async () => {
      store.add('token', AdminRole.Support);
      await post('/api/admin/probe/failing', 'token').expect(409);

      expect(auditEntries).toEqual([
        expect.objectContaining({ action: 'things.fail', succeeded: false }),
      ]);
    });

    it('records nothing when the guard refuses the request', async () => {
      store.add('token', AdminRole.Support);
      await post('/api/admin/probe/things/42/delete', 'token', {
        reason: 'Not allowed',
      }).expect(403);

      expect(auditEntries).toEqual([]);
    });
  });
});
