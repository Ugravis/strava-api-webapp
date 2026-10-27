import { AdminRole } from '@kilotrace/shared/admin';
import {
  Controller,
  Get,
  type INestApplication,
  type MiddlewareConsumer,
  Module,
  type NestModule,
  Param,
  Post,
} from '@nestjs/common';
import { APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import cookieParser from 'cookie-parser';
import type { Request } from 'express';
import request from 'supertest';
import type { App } from 'supertest/types';
import { AdminAccessMiddleware } from '../src/admin/access/admin-access.middleware';
import {
  ADMIN_THROTTLE,
  AdminController,
} from '../src/admin/access/admin-controller.decorator';
import { AdminRolesGuard } from '../src/admin/access/admin-roles.guard';
import { Roles } from '../src/admin/access/roles.decorator';
import { AdminMeController } from '../src/admin/admin-me.controller';
import { ADMIN_ROUTES } from '../src/admin/admin.module';
import {
  type AuditEntry,
  AdminAuditLogService,
} from '../src/admin/audit/admin-audit-log.service';
import { AuditInterceptor } from '../src/admin/audit/audit.interceptor';
import { Audited } from '../src/admin/audit/audited.decorator';
import { SessionGuard } from '../src/auth/guards/session.guard';
import { SessionCookie } from '../src/auth/session-cookie';
import { SessionsService } from '../src/auth/sessions/sessions.service';
import { DEFAULT_THROTTLE } from '../src/auth/throttle';
import { ApiErrorCode, ApiErrors } from '../src/common/api-error';
import { API_PREFIX } from '../src/common/api-prefix';
import type { User } from '../src/users/user.entity';

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

  @Get('throttled')
  @Roles(AdminRole.Support)
  throttled(): string {
    return 'throttled';
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
    destructive: true,
  })
  deleteThing(@Param('id') id: string): string {
    return id;
  }

  @Post('things/:id/:kind/mask')
  @Roles(AdminRole.SuperAdmin)
  @Audited({
    action: 'things.mask',
    target: { type: 'thing', param: 'id' },
    details: ['kind', 'fields', 'missing'],
    hidden: true,
  })
  maskThing(@Param('id') id: string): string {
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
class RogueController {
  @Get()
  @Roles(AdminRole.Support)
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

/** Stands for the database: users are read on every validation. */
class FakeUserStore {
  readonly users = new Map<string, User>();

  add(token: string, roles: AdminRole[] = []): User {
    const user = { id: `${token}-id`, roles } as User;
    this.users.set(token, user);
    return user;
  }

  validate(token: string) {
    const user = this.users.get(token);
    return Promise.resolve(
      user
        ? { session: { id: token }, user: { ...user }, renewed: false }
        : null,
    );
  }
}

const store = new FakeUserStore();
const auditEntries: AuditEntry[] = [];

@Module({
  imports: [ThrottlerModule.forRoot([DEFAULT_THROTTLE])],
  controllers: [
    AdminMeController,
    ProbeController,
    RogueController,
    UserAreaController,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    { provide: APP_GUARD, useClass: SessionGuard },
    { provide: APP_GUARD, useClass: AdminRolesGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
    {
      provide: SessionsService,
      useValue: { validate: (token: string) => store.validate(token) },
    },
    {
      provide: SessionCookie,
      useValue: {
        read: (req: Request) =>
          (req.cookies as Record<string, string>).kilotrace_session ?? null,
      },
    },
    {
      provide: AdminAuditLogService,
      useValue: {
        record: (entry: AuditEntry) => {
          auditEntries.push(entry);
          return Promise.resolve();
        },
      },
    },
  ],
})
class TestAdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(AdminAccessMiddleware).forRoutes(...ADMIN_ROUTES);
  }
}

describe('Admin guards (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [TestAdminModule],
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
    store.users.clear();
    auditEntries.length = 0;
  });

  const as = (token: string) => `kilotrace_session=${token}`;
  const get = (path: string, token?: string) => {
    const call = request(app.getHttpServer()).get(path);
    return token ? call.set('Cookie', as(token)) : call;
  };
  const post = (path: string, token: string, body?: object) =>
    request(app.getHttpServer()).post(path).set('Cookie', as(token)).send(body);

  describe('404 for non-admins', () => {
    const notFound = (method: string, path: string) => ({
      message: `Cannot ${method} ${path}`,
      error: 'Not Found',
      statusCode: 404,
    });

    it.each([
      '/api/admin',
      '/api/admin/',
      '/api/admin/me',
      '/api/admin/probe/support',
      '/api/ADMIN/me',
      '/api/admin/rogue',
      '/api/admin/does-not-exist',
    ])('answers %s like an unknown route', async (path) => {
      store.add('user');
      await get(path).expect(404).expect(notFound('GET', path));
      await get(path, 'user').expect(404).expect(notFound('GET', path));
      await get(path, 'unknown').expect(404).expect(notFound('GET', path));
    });

    it('answers a state-changing route the same way, before validation', async () => {
      store.add('user');
      await post('/api/admin/probe/things/42/delete', 'user', {})
        .expect(404)
        .expect(notFound('POST', '/api/admin/probe/things/42/delete'));
      expect(auditEntries).toEqual([]);
    });

    it('matches the 404 of an unknown route outside the back office', async () => {
      const unknown = await get('/api/nothing-here').expect(404);
      const admin = await get('/api/admin/me').expect(404);
      expect(Object.keys(admin.body as object)).toEqual(
        Object.keys(unknown.body as object),
      );
    });

    it('is never rate limited, unlike the existing routes for admins', async () => {
      store.add('user');
      for (let i = 0; i <= ADMIN_THROTTLE.limit; i += 1) {
        await get('/api/admin/me', 'user').expect(404);
      }
    });

    it('leaves the user routes to the session guard', async () => {
      store.add('user');
      await get('/api/user-area', 'user').expect(200);
      await get('/api/user-area').expect(401);
    });
  });

  describe('admins', () => {
    it('returns the roles of the caller', async () => {
      store.add('token', [AdminRole.Support, AdminRole.Admin]);
      await get('/api/admin/me', 'token')
        .expect(200)
        .expect({ roles: ['support', 'admin'] });
    });

    it('answers an unknown back-office route with a 404', () => {
      store.add('super', [AdminRole.SuperAdmin]);
      return get('/api/admin/does-not-exist', 'super').expect(404);
    });

    it('still open the user routes', () => {
      store.add('super', [AdminRole.SuperAdmin]);
      return get('/api/user-area', 'super').expect(200);
    });

    it('have a dedicated rate limit, per admin', async () => {
      store.add('token', [AdminRole.Support]);
      for (let i = 0; i < ADMIN_THROTTLE.limit; i += 1) {
        await get('/api/admin/probe/throttled', 'token').expect(200);
      }
      await get('/api/admin/probe/throttled', 'token').expect(429);

      // Counted per admin, not per IP: they all call through the Next server.
      store.add('other', [AdminRole.Support]);
      await get('/api/admin/probe/throttled', 'other').expect(200);
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
      store.add('token', [role]);
      return get(`/api/admin/probe/${route}`, 'token').expect(status);
    });

    it('grants a route when any of the roles reaches it', () => {
      store.add('token', [AdminRole.Support, AdminRole.SuperAdmin]);
      return get('/api/admin/probe/super-admin', 'token').expect(200);
    });
  });

  describe('deny by default', () => {
    it('refuses a route without @Roles(), even to a super-admin', () => {
      store.add('super', [AdminRole.SuperAdmin]);
      return get('/api/admin/probe/no-role', 'super')
        .expect(403)
        .expect(({ body }) =>
          expect(body).toMatchObject({ code: 'ADMIN_FORBIDDEN' }),
        );
    });

    it('refuses a state-changing route without @Audited()', () => {
      store.add('super', [AdminRole.SuperAdmin]);
      return post('/api/admin/probe/unaudited', 'super').expect(403);
    });

    // Variants the router still matches to the same route.
    it.each(['/api/admin/rogue', '/api/ADMIN/rogue', '/api/admin/rogue/'])(
      'refuses %s, under /admin without @AdminController()',
      (path) => {
        store.add('super', [AdminRole.SuperAdmin]);
        return get(path, 'super').expect(403);
      },
    );
  });

  describe('immediate role changes', () => {
    it('applies a downgrade on the next request', async () => {
      const user = store.add('token', [AdminRole.Admin]);
      await get('/api/admin/probe/admin', 'token').expect(200);

      user.roles = [AdminRole.Support];

      await get('/api/admin/probe/admin', 'token').expect(403);
      await get('/api/admin/probe/support', 'token').expect(200);
    });

    it('hides the back office once the last role is withdrawn', async () => {
      const user = store.add('token', [AdminRole.SuperAdmin]);
      await get('/api/admin/me', 'token').expect(200);

      user.roles = [];

      await get('/api/admin/me', 'token').expect(404);
    });
  });

  describe('audit log', () => {
    it('requires a reason for a destructive action and records nothing without it', async () => {
      store.add('token', [AdminRole.Admin]);
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
      const user = store.add('token', [AdminRole.Admin]);
      await post('/api/admin/probe/things/42/delete', 'token', {
        reason: '  Duplicate entry  ',
      }).expect(201);

      expect(auditEntries).toEqual([
        {
          actorId: user.id,
          action: 'things.delete',
          targetType: 'thing',
          targetId: '42',
          reason: 'Duplicate entry',
          details: null,
          succeeded: true,
          status: 201,
          hiddenBy: null,
        },
      ]);
    });

    it('records the details named by the route, and masks the entry when asked', async () => {
      const user = store.add('token', [AdminRole.SuperAdmin]);
      await post('/api/admin/probe/things/42/badge/mask', 'token', {
        fields: ['bio'],
        kind: 'overridden',
      }).expect(201);

      expect(auditEntries).toEqual([
        expect.objectContaining({
          action: 'things.mask',
          details: { kind: 'badge', fields: ['bio'] },
          hiddenBy: user.id,
        }),
      ]);
    });

    it('records a failed action, then returns its error', async () => {
      store.add('token', [AdminRole.Support]);
      await post('/api/admin/probe/failing', 'token').expect(409);

      expect(auditEntries).toEqual([
        expect.objectContaining({
          action: 'things.fail',
          succeeded: false,
          status: 409,
        }),
      ]);
    });

    it('records nothing when the guard refuses the request', async () => {
      store.add('token', [AdminRole.Support]);
      await post('/api/admin/probe/things/42/delete', 'token', {
        reason: 'Not allowed',
      }).expect(403);

      expect(auditEntries).toEqual([]);
    });
  });
});
