import 'reflect-metadata';
import { join } from 'node:path';
import { DataSource } from 'typeorm';

/**
 * Data source used by the TypeORM CLI to generate and run migrations.
 * The application itself is configured through `config/database.config.ts`.
 */
export default new DataSource({
  type: 'postgres',
  // Uses the built-in gen_random_uuid() (PostgreSQL 13+) instead of the uuid-ossp extension.
  uuidExtension: 'pgcrypto',
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  username: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD ?? 'postgres',
  database: process.env.DB_NAME ?? 'strava_webapp',
  entities: [join(__dirname, '..', '**', '*.entity.{js,ts}')],
  migrations: [join(__dirname, 'migrations', '*.{js,ts}')],
});
