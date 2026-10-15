import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import type { NestExpressApplication } from '@nestjs/platform-express';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';
import { originCheck } from './common/origin-check.middleware';
import authConfig, { type AuthConfig } from './config/auth.config';
import { StravaWebhookSubscriptionService } from './strava/webhooks/strava-webhook-subscription.service';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  const config = app.get<AuthConfig>(authConfig.KEY);
  const frontendOrigin = new URL(config.frontendUrl).origin;

  // The API is reached through the frontend proxy: trust it for the client IP.
  app.set('trust proxy', process.env.TRUST_PROXY ?? 'loopback, uniquelocal');
  app.setGlobalPrefix('api');
  app.use(cookieParser(config.cookieSecret));
  app.use(originCheck(frontendOrigin));
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.enableCors({ origin: frontendOrigin, credentials: true });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 4000);
  // Strava validates the callback while subscribing: the server must listen first.
  void app.get(StravaWebhookSubscriptionService).ensure();
}
void bootstrap();
