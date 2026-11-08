import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  type INestApplication,
  Post,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { SkipThrottle } from '@nestjs/throttler';
import request from 'supertest';
import type { App } from 'supertest/types';
import { ApiEndpointsService } from '../src/api-index/api-endpoints.service';
import { ApiIndexModule } from '../src/api-index/api-index.module';
import { Public } from '../src/auth/decorators/public.decorator';
import { SensitiveThrottle } from '../src/auth/throttle';
import { API_PREFIX } from '../src/common/api-prefix';

@Controller('things')
class ThingsController {
  @Public()
  @Get(':id')
  find(): void {}

  @SensitiveThrottle()
  @Post()
  create(): void {}

  @SkipThrottle()
  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(): void {}
}

describe('API index (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [ApiIndexModule.forEnvironment()],
      controllers: [ThingsController],
    }).compile();
    app = moduleRef.createNestApplication();
    app.setGlobalPrefix(API_PREFIX);
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('lists the endpoints with their characteristics', () => {
    const endpoints = app.get(ApiEndpointsService).list();

    expect(endpoints).toEqual(
      expect.arrayContaining([
        {
          method: 'GET',
          path: '/api/things/:id',
          access: 'public',
          rateLimit: '120 / 60 s',
          status: 200,
          handler: 'ThingsController.find',
        },
        expect.objectContaining({
          method: 'POST',
          path: '/api/things',
          access: 'session',
          rateLimit: '10 / 60 s',
          status: 201,
        }),
        expect.objectContaining({
          method: 'DELETE',
          rateLimit: null,
          status: 204,
        }),
        expect.objectContaining({
          method: 'GET',
          path: '/api',
          access: 'public',
        }),
      ]),
    );
  });

  it('GET /api serves the listing as HTML', async () => {
    const response = await request(app.getHttpServer())
      .get('/api')
      .expect(200)
      .expect('Content-Type', /text\/html/);

    expect(response.text).toContain('/api/things/:id');
    expect(response.text).toContain('ThingsController.remove');
  });
});
