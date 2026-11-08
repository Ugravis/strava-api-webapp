import type { AdminDatabaseTable } from '@kilotrace/shared/admin';
import { Injectable } from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';

/**
 * Every table of the database outside the catalogs of Postgres, with its
 * figures, columns, indexes and links: read from the catalogs only, never
 * from the rows themselves.
 */
const TABLES_SQL = `
SELECT
  n.nspname || '.' || c.relname AS id,
  n.nspname AS schema,
  c.relname AS name,
  obj_description(c.oid, 'pg_class') AS comment,
  (SELECT e.extname FROM pg_depend d JOIN pg_extension e ON e.oid = d.refobjid
    WHERE d.classid = 'pg_class'::regclass AND d.objid = c.oid AND d.deptype = 'e' LIMIT 1) AS extension,
  GREATEST(CASE WHEN c.reltuples < 0 THEN COALESCE(s.n_live_tup, 0) ELSE c.reltuples END, 0)::bigint AS rows,
  pg_total_relation_size(c.oid) AS "totalBytes",
  pg_relation_size(c.oid) AS "tableBytes",
  pg_indexes_size(c.oid) AS "indexBytes",
  COALESCE((
    SELECT json_agg(json_build_object(
      'name', a.attname,
      'type', format_type(a.atttypid, a.atttypmod),
      'nullable', NOT a.attnotnull,
      'default', pg_get_expr(ad.adbin, ad.adrelid),
      'primaryKey', EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.oid AND i.indisprimary AND a.attnum = ANY (i.indkey))
    ) ORDER BY a.attnum)
    FROM pg_attribute a
    LEFT JOIN pg_attrdef ad ON ad.adrelid = a.attrelid AND ad.adnum = a.attnum
    WHERE a.attrelid = c.oid AND a.attnum > 0 AND NOT a.attisdropped
  ), '[]') AS columns,
  COALESCE((
    SELECT json_agg(json_build_object(
      'name', ic.relname,
      'definition', pg_get_indexdef(i.indexrelid),
      'unique', i.indisunique,
      'primary', i.indisprimary,
      'bytes', pg_relation_size(i.indexrelid),
      'scans', COALESCE(si.idx_scan, 0)
    ) ORDER BY i.indisprimary DESC, ic.relname)
    FROM pg_index i
    JOIN pg_class ic ON ic.oid = i.indexrelid
    LEFT JOIN pg_stat_all_indexes si ON si.indexrelid = i.indexrelid
    WHERE i.indrelid = c.oid
  ), '[]') AS indexes,
  COALESCE((
    SELECT json_agg(json_build_object(
      'name', fk.conname,
      'references', fn.nspname || '.' || fc.relname,
      'definition', pg_get_constraintdef(fk.oid)
    ) ORDER BY fk.conname)
    FROM pg_constraint fk
    JOIN pg_class fc ON fc.oid = fk.confrelid
    JOIN pg_namespace fn ON fn.oid = fc.relnamespace
    WHERE fk.conrelid = c.oid AND fk.contype = 'f'
  ), '[]') AS "foreignKeys",
  COALESCE((
    SELECT json_agg(DISTINCT rn.nspname || '.' || rc.relname)
    FROM pg_constraint rk
    JOIN pg_class rc ON rc.oid = rk.conrelid
    JOIN pg_namespace rn ON rn.oid = rc.relnamespace
    WHERE rk.confrelid = c.oid AND rk.contype = 'f'
  ), '[]') AS "referencedBy",
  COALESCE(s.seq_scan, 0) AS "seqScans",
  COALESCE(s.idx_scan, 0) AS "indexScans",
  COALESCE(s.n_tup_ins, 0) AS inserts,
  COALESCE(s.n_tup_upd, 0) AS updates,
  COALESCE(s.n_tup_del, 0) AS deletes,
  COALESCE(s.n_dead_tup, 0) AS "deadRows",
  GREATEST(s.last_vacuum, s.last_autovacuum) AS "lastVacuum",
  GREATEST(s.last_analyze, s.last_autoanalyze) AS "lastAnalyze"
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
LEFT JOIN pg_stat_all_tables s ON s.relid = c.oid
WHERE c.relkind IN ('r', 'p')
  AND NOT c.relispartition
  AND n.nspname NOT IN ('pg_catalog', 'information_schema')
  AND n.nspname NOT LIKE 'pg\\_%'
ORDER BY n.nspname, c.relname
`;

type RawTable = Omit<
  AdminDatabaseTable,
  'lastVacuum' | 'lastAnalyze' | NumberKey
> &
  Record<NumberKey, string | number> & {
    lastVacuum: Date | null;
    lastAnalyze: Date | null;
  };

type NumberKey =
  | 'rows'
  | 'totalBytes'
  | 'tableBytes'
  | 'indexBytes'
  | 'seqScans'
  | 'indexScans'
  | 'inserts'
  | 'updates'
  | 'deletes'
  | 'deadRows';

/** Bigints come back as text from the driver. */
const NUMBER_KEYS: NumberKey[] = [
  'rows',
  'totalBytes',
  'tableBytes',
  'indexBytes',
  'seqScans',
  'indexScans',
  'inserts',
  'updates',
  'deletes',
  'deadRows',
];

@Injectable()
export class AdminDatabaseService {
  constructor(@InjectDataSource() private readonly dataSource: DataSource) {}

  async tables(): Promise<AdminDatabaseTable[]> {
    const rows: RawTable[] = await this.dataSource.query(TABLES_SQL);
    return rows.map((row) => ({
      ...row,
      ...(Object.fromEntries(
        NUMBER_KEYS.map((key) => [key, Number(row[key])]),
      ) as Record<NumberKey, number>),
      indexes: row.indexes.map((index) => ({
        ...index,
        bytes: Number(index.bytes),
        scans: Number(index.scans),
      })),
      lastVacuum: row.lastVacuum?.toISOString() ?? null,
      lastAnalyze: row.lastAnalyze?.toISOString() ?? null,
    }));
  }
}
