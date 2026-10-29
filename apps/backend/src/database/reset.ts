import 'reflect-metadata';
import storageConfig from '../config/storage.config';
import { importCountries } from '../countries/import/countries-importer';
import { S3StorageService } from '../storage/s3-storage.service';
import dataSource from './data-source';

/**
 * Tables kept by the reset: the imported datasets (country boundaries,
 * stations and railway links), what is computed from them alone, the
 * catalogs seeded by the migrations and the PostGIS and TypeORM tables.
 */
const KEPT_TABLES = [
  'countries',
  'country_parts',
  'located_tiles',
  'tile_countries',
  'places',
  'rail_links',
  'rail_link_countries',
  'railway_imports',
  'badge_themes',
  'badges',
  'user_tags',
  'reserved_usernames',
  'admin_role_permissions',
  'migrations',
  'spatial_ref_sys',
];

/**
 * Development only: applies the pending migrations, empties every table
 * except the kept ones (user data), imports the country boundaries when
 * there are none yet (about 5 minutes) and empties the object storage
 * (uploaded avatars, map previews).
 * Usage: `pnpm db:reset` from the repository root;
 * `pnpm db:reset --skip-countries` skips the country import.
 */
async function reset(): Promise<void> {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('Refusing to reset the database when NODE_ENV=production');
  }

  await dataSource.initialize();
  try {
    const { host, database } = dataSource.options as {
      host?: string;
      database?: string;
    };
    console.log(`Resetting database "${database}" on ${host}…`);
    const migrations = await dataSource.runMigrations();
    console.log(`${migrations.length} migration(s) applied.`);

    const tables: { tablename: string }[] = await dataSource.query(
      `SELECT tablename FROM pg_tables
       WHERE schemaname = 'public' AND tablename <> ALL($1)
       ORDER BY tablename`,
      [KEPT_TABLES],
    );
    // Without CASCADE, PostgreSQL refuses the whole statement if a kept
    // table references an emptied one, so the kept tables stay intact.
    await dataSource.query(
      `TRUNCATE ${tables.map((t) => `"${t.tablename}"`).join(', ')} RESTART IDENTITY`,
    );
    console.log(`${tables.length} table(s) emptied, datasets kept.`);

    const [{ count }]: { count: number }[] = await dataSource.query(
      'SELECT count(*)::int AS count FROM countries',
    );
    if (count === 0 && !process.argv.includes('--skip-countries')) {
      await importCountries(dataSource);
    }
  } finally {
    await dataSource.destroy();
  }

  const config = storageConfig();
  const deleted = await new S3StorageService(config).deleteAll();
  console.log(
    `Storage emptied: ${deleted} object(s) deleted from "${config.bucket}".`,
  );
}

reset().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
