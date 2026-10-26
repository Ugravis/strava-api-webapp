import 'reflect-metadata';
import dataSource from '../../database/data-source';
import { importStations } from './stations-importer';

/**
 * Usage: `pnpm stations:import <file.osm.pbf>` from the repository root, on
 * the host (osmium must be installed): the planet or any extract.
 */
async function main(source: string | undefined): Promise<void> {
  if (!source) {
    throw new Error('Usage: pnpm stations:import <file.osm.pbf>');
  }
  await dataSource.initialize();
  try {
    await importStations(dataSource, source);
  } finally {
    await dataSource.destroy();
  }
}

main(process.argv[2]).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
