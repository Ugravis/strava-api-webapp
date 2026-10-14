import 'reflect-metadata';
import dataSource from './data-source';

/**
 * Development only: drops every table and type, then replays the migrations.
 * Usage: `pnpm db:reset` from the repository root.
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
    console.log(`Done: ${migrations.length} migration(s) applied.`);
  } finally {
    await dataSource.destroy();
  }
}

reset().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
