import 'reflect-metadata';
import storageConfig from '../config/storage.config';
import { importCountries } from '../countries/import/countries-importer';
import { S3StorageService } from '../storage/s3-storage.service';
import dataSource from './data-source';

/**
 * Development only: drops every table and type, replays the migrations,
 * imports the country boundaries again (about 5 minutes) and empties the
 * object storage (uploaded avatars).
 * Usage: `pnpm db:reset` from the repository root;
 * `pnpm db:reset --skip-countries` keeps the database without countries.
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
    await dataSource.dropDatabase();
    const migrations = await dataSource.runMigrations();
    console.log(`Database ready: ${migrations.length} migration(s) applied.`);
    if (!process.argv.includes('--skip-countries')) {
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
