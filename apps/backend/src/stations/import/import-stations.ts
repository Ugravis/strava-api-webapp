import 'reflect-metadata';
import dataSource from '../../database/data-source';
import { importStations, saveSegments } from './stations-importer';

/**
 * Usage: `pnpm stations:import <file.osm.pbf> [--zones-only|--segments-only]` from the
 * repository root, on the host (osmium must be installed): the planet or any
 * extract. `--zones-only` recomputes the zones of the stations of the file
 * only, keeping every station and link. `--segments-only` takes no file: it
 * recomputes the railway segments of the ties from the links in the database.
 */
async function main(args: string[]): Promise<void> {
  const zonesOnly = args.includes('--zones-only');
  const source = args.find((arg) => !arg.startsWith('--'));
  if (args.includes('--segments-only')) {
    await dataSource.initialize();
    try {
      const startedAt = Date.now();
      await saveSegments(dataSource);
      console.log(`segments: ${Math.round((Date.now() - startedAt) / 1000)} s`);
    } finally {
      await dataSource.destroy();
    }
    return;
  }
  if (!source) {
    throw new Error(
      'Usage: pnpm stations:import <file.osm.pbf> [--zones-only]',
    );
  }
  await dataSource.initialize();
  try {
    await importStations(dataSource, source, { zonesOnly });
  } finally {
    await dataSource.destroy();
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
