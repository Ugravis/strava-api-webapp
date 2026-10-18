import 'reflect-metadata';
import dataSource from '../../database/data-source';
import { importStations } from './stations-importer';

/** Usage: `pnpm stations:import` from the repository root. */
async function main(): Promise<void> {
  await dataSource.initialize();
  try {
    await importStations(dataSource);
  } finally {
    await dataSource.destroy();
  }
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
