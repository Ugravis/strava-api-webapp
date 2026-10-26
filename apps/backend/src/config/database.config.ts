import { registerAs } from '@nestjs/config';
import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import { join } from 'node:path';

export default registerAs('database', (): TypeOrmModuleOptions => ({
  type: 'postgres',
  // Uses the built-in gen_random_uuid() (PostgreSQL 13+) instead of the uuid-ossp extension.
  uuidExtension: 'pgcrypto',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'strava_webapp',
  autoLoadEntities: true,
  // Schema changes go through migrations, never through synchronize.
  synchronize: false,
  migrations: [join(__dirname, '..', 'database', 'migrations', '*.{js,ts}')],
  migrationsRun: true,
}));
