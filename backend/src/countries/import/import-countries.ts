import 'reflect-metadata';
import dataSource from '../../database/data-source';
import { importCountries } from './countries-importer';
import { OVERTURE_RELEASE } from './overture-countries';

/** Usage: `pnpm countries:import [release]` from the repository root. */
async function main(release: string): Promise<void> {
  await dataSource.initialize();
  try {
    await importCountries(dataSource, release);
  } finally {
    await dataSource.destroy();
  }
}

main(process.argv[2] ?? OVERTURE_RELEASE).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
