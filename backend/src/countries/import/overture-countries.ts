import { DuckDBBlobValue, DuckDBInstance } from '@duckdb/node-api';
import { type CountryArea, toCountryAreas } from './country-areas';

/** Overture Maps release the boundaries are read from (monthly, kept a few months). */
export const OVERTURE_RELEASE = '2026-09-23.1';

const BUCKET = 's3://overturemaps-us-west-2/release';

/**
 * Downloads the land areas of every country and dependency of an Overture
 * Maps release (about 300 MB read from the public S3 bucket, no account
 * needed), with the dependencies attached to their sovereign country.
 */
export async function readOvertureCountries(
  release: string,
): Promise<CountryArea[]> {
  const instance = await DuckDBInstance.create(':memory:');
  const connection = await instance.connect();
  try {
    await connection.run(`
      INSTALL spatial; LOAD spatial;
      INSTALL httpfs; LOAD httpfs;
      SET s3_region = 'us-west-2';
    `);
    const divisions = `read_parquet('${BUCKET}/${release}/theme=divisions/type=division/*.parquet')`;
    const areas = `read_parquet('${BUCKET}/${release}/theme=divisions/type=division_area/*.parquet')`;

    const dependencies = await connection.runAndReadAll(`
      SELECT d.id, p.country
      FROM ${divisions} d JOIN ${divisions} p ON p.id = d.parent_division_id
      WHERE d.subtype = 'dependency' AND p.subtype = 'country'
    `);
    const sovereignByDivision = new Map(
      dependencies
        .getRows()
        .map(([id, country]) => [String(id), String(country)]),
    );

    const rows = await connection.runAndReadAll(`
      SELECT country, division_id, ST_AsWKB(geometry) AS wkb
      FROM ${areas}
      WHERE subtype IN ('country', 'dependency') AND class = 'land'
    `);
    return toCountryAreas(
      rows.getRows().map(([country, divisionId, wkb]) => {
        if (!(wkb instanceof DuckDBBlobValue)) {
          throw new Error(`Unexpected geometry for ${String(country)}`);
        }
        return {
          country: String(country),
          divisionId: String(divisionId),
          wkb: wkb.bytes,
        };
      }),
      sovereignByDivision,
    );
  } finally {
    connection.closeSync();
    instance.closeSync();
  }
}
