import {
  layoutTablePage,
  TABLE_DEFAULT_SORT,
  type TableGroup,
  type TablePage,
  type TableQuery,
  tableQueryFromSearch,
  tablePageOf,
  type TableSort,
} from '@kilotrace/shared/table';
import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { ObjectLiteral, SelectQueryBuilder } from 'typeorm';
import { likeEscaped } from './like-escaped';

/**
 * A filter of the table: a column of single values, counted per value, or
 * one SQL condition per option, e.g. for a value spread over several
 * columns or rows (`EXISTS (…)`).
 */
export type TableFacetSpec =
  { column: string } | { options: Record<string, string> };

/**
 * What a table may be searched, sorted, filtered and grouped by, as SQL
 * expressions on the aliases of its query builder. Ids are those of the
 * columns, facets and groupings of the frontend table; anything else asked
 * is ignored.
 */
export interface TableSpec {
  /** Matched by the search, case-insensitively, any of them. */
  search?: string[];
  /** Per sortable column; empty values last, whichever the direction. */
  sorts: Record<string, string>;
  /** `createdAt` newest first unless said otherwise. */
  defaultSort?: TableSort;
  /** A unique expression, for a stable order among equals, e.g. `user.id`. */
  tiebreak: string;
  facets?: Record<string, TableFacetSpec>;
  /** Per grouping; the text of the value is the key of the group. */
  groupings?: Record<string, string>;
}

/** The table query of the request, read from its query string. */
export const TableQueryParam = createParamDecorator(
  (defaultSort: TableSort | undefined, context: ExecutionContext) =>
    tableQueryFromSearch(
      context.switchToHttp().getRequest<Request>().query as Record<
        string,
        unknown
      >,
      defaultSort,
    ),
);

/**
 * Serves a page of a table from `base`, a query builder of every row the
 * caller may see, without order. Its joins must be to-one: a to-many join
 * would repeat rows, filter on those through an `EXISTS` condition instead.
 * Facets are counted over all of `base`, before search and filters.
 */
export async function runTableQuery<E extends ObjectLiteral>(
  base: SelectQueryBuilder<E>,
  query: TableQuery,
  spec: TableSpec,
): Promise<TablePage<E>> {
  const builder = base.clone();
  if (query.q && spec.search?.length) {
    const matches = spec.search.map(
      (expression) => `lower(${expression}) LIKE :table_q`,
    );
    builder.andWhere(`(${matches.join(' OR ')})`, {
      table_q: `%${likeEscaped(query.q.toLowerCase())}%`,
    });
  }
  Object.entries(spec.facets ?? {}).forEach(([id, facet], index) => {
    const values = query.filters[id] ?? [];
    if (values.length === 0) return;
    if ('column' in facet) {
      builder.andWhere(`${facet.column} IN (:...table_f${index})`, {
        [`table_f${index}`]: values,
      });
      return;
    }
    const conditions = values.flatMap((value) =>
      facet.options[value] ? [`(${facet.options[value]})`] : [],
    );
    if (conditions.length > 0) builder.andWhere(`(${conditions.join(' OR ')})`);
  });

  const grouping = query.groupBy && spec.groupings?.[query.groupBy];
  const key = grouping ? `COALESCE((${grouping})::text, '')` : null;
  const [counts, total, groups] = await Promise.all([
    facetCounts(base, spec),
    builder.clone().orderBy().getCount(),
    key ? groupsOf(builder, key) : null,
  ]);
  const folded = query.folded.filter((each) =>
    groups?.some((group) => group.key === each),
  );
  const layout = layoutTablePage(
    groups,
    total,
    folded,
    query.page,
    query.pageSize,
  );
  const take = layout.parts.reduce((sum, part) => sum + part.rows, 0);
  if (take === 0) return tablePageOf(layout, [], total, counts);

  const sort = spec.sorts[query.sort.id]
    ? query.sort
    : (spec.defaultSort ?? TABLE_DEFAULT_SORT);
  const page = builder.clone().orderBy();
  // The groups first, in the order of their titles, each sorted within.
  if (key) {
    page.addOrderBy(key);
    if (folded.length > 0) {
      page.andWhere(`${key} NOT IN (:...table_fold)`, { table_fold: folded });
    }
  }
  if (spec.sorts[sort.id]) {
    page.addOrderBy(
      spec.sorts[sort.id],
      sort.desc ? 'DESC' : 'ASC',
      'NULLS LAST',
    );
  }
  const rows = await page
    .addOrderBy(spec.tiebreak)
    .offset(layout.before)
    .limit(take)
    .getMany();
  return tablePageOf(layout, rows, total, counts);
}

async function groupsOf<E extends ObjectLiteral>(
  builder: SelectQueryBuilder<E>,
  key: string,
): Promise<TableGroup[]> {
  const raw = await builder
    .clone()
    .select(key, 'key')
    .addSelect('COUNT(*)', 'count')
    .groupBy(key)
    .orderBy(key)
    .getRawMany<{ key: string; count: string }>();
  return raw.map((group) => ({ key: group.key, count: Number(group.count) }));
}

async function facetCounts<E extends ObjectLiteral>(
  base: SelectQueryBuilder<E>,
  spec: TableSpec,
): Promise<TablePage<E>['counts']> {
  const entries = await Promise.all(
    Object.entries(spec.facets ?? {}).map(async ([id, facet]) => {
      if ('column' in facet) {
        const raw = await base
          .clone()
          .select(`(${facet.column})::text`, 'value')
          .addSelect('COUNT(*)', 'count')
          .groupBy(facet.column)
          .orderBy()
          .getRawMany<{ value: string | null; count: string }>();
        return [
          id,
          Object.fromEntries(
            raw.map((each) => [each.value ?? '', Number(each.count)]),
          ),
        ] as const;
      }
      const options = Object.entries(facet.options);
      const builder = base.clone().orderBy();
      options.forEach(([, condition], index) =>
        index === 0
          ? builder.select(`COUNT(*) FILTER (WHERE ${condition})`, 'c0')
          : builder.addSelect(
              `COUNT(*) FILTER (WHERE ${condition})`,
              `c${index}`,
            ),
      );
      const raw = await builder.getRawOne<Record<string, string>>();
      return [
        id,
        Object.fromEntries(
          options.map(([value], index) => [value, Number(raw?.[`c${index}`])]),
        ),
      ] as const;
    }),
  );
  return Object.fromEntries(entries);
}
