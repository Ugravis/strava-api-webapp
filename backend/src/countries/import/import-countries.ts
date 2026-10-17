import 'reflect-metadata';
import dataSource from '../../database/data-source';
import { OVERTURE_RELEASE, readOvertureCountries } from './overture-countries';

/** Below this, the download is considered incomplete and nothing is replaced. */
const MIN_COUNTRIES = 150;
/** Vertices per part: small parts keep the spatial index selective. */
const PART_MAX_VERTICES = 256;
/** Web Mercator stops at about ±85.05°. */
const MERCATOR_MAX_LAT = 85.0511;

/**
 * Imports the country boundaries from Overture Maps, replacing the previous
 * ones. The backend then locates every tile again (within an hour, or at
 * its next start) and computes again the totals and the tile shapes of the
 * visited countries.
 * Usage: `pnpm countries:import [release]` from the repository root.
 */
async function importCountries(release: string): Promise<void> {
  console.log(`Reading the countries of Overture Maps ${release}…`);
  const areas = await readOvertureCountries(release);
  const codes = new Set(areas.map((area) => area.code));
  if (codes.size < MIN_COUNTRIES) {
    throw new Error(
      `Only ${codes.size} countries read from Overture Maps ${release}: nothing imported`,
    );
  }

  await dataSource.initialize();
  try {
    await dataSource.transaction(async (manager) => {
      await manager.query(
        'CREATE TEMP TABLE country_areas (code char(2), geom geometry) ON COMMIT DROP',
      );
      for (const area of areas) {
        await manager.query(
          `INSERT INTO country_areas
           VALUES ($1, ST_CollectionExtract(ST_MakeValid(ST_GeomFromWKB($2, 4326)), 3))`,
          [area.code, Buffer.from(area.wkb)],
        );
      }
      // Cascades to the parts and to the countries of the located tiles.
      await manager.query('DELETE FROM countries');
      await manager.query('DELETE FROM located_tiles');
      await manager.query(
        'INSERT INTO countries (code) SELECT DISTINCT code FROM country_areas',
      );
      await manager.query(
        `INSERT INTO country_parts (country_code, geom)
         SELECT code, part
         FROM country_areas,
           LATERAL ST_Subdivide(ST_Transform(ST_ClipByBox2D(geom,
             ST_MakeEnvelope(-180, -$2::float8, 180, $2::float8, 4326)), 3857), $1) AS part
         WHERE GeometryType(part) = 'POLYGON'`,
        [PART_MAX_VERTICES, MERCATOR_MAX_LAT],
      );
    });
    await dataSource.query('ANALYZE country_parts');
    const [{ parts }]: { parts: number }[] = await dataSource.query(
      'SELECT count(*)::int AS parts FROM country_parts',
    );
    console.log(`Imported ${codes.size} countries (${parts} parts).`);
  } finally {
    await dataSource.destroy();
  }
}

importCountries(process.argv[2] ?? OVERTURE_RELEASE).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
