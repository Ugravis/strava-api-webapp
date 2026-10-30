import { layoutTablePage, type TablePage, type TableQuery, tablePageOf } from "@kilotrace/shared/table";

/** How to read the rows, the browser counterpart of the `TableSpec` of the backend. */
export interface LocalTableSpec<T> {
  /** The text matched by the search, case-insensitively. */
  search?: (row: T) => string;
  /** Per sortable column; empty values last, whichever the direction. */
  sorts: Record<string, (row: T) => string | number | null>;
  /** Per facet: the values of the row; a row is kept when any is picked. */
  facets?: Record<string, { options: string[]; values: (row: T) => string[] }>;
  /** Per grouping: the key of the group of the row. */
  groupings?: Record<string, (row: T) => string>;
  /** A pause before answering, in ms, to mimic the network, e.g. in demos. */
  delay?: () => number;
}

/**
 * A `fetch` of a table over rows already in the browser, e.g. a short list
 * loaded at once, cut in pages exactly like the server does.
 */
export function localTableSource<T>(rows: T[], spec: LocalTableSpec<T>): (query: TableQuery) => Promise<TablePage<T>> {
  return (query) => {
    const page = servePage(rows, spec, query);
    const delay = spec.delay?.() ?? 0;
    return delay > 0 ? new Promise((resolve) => setTimeout(() => resolve(page), delay)) : Promise.resolve(page);
  };
}

function servePage<T>(rows: T[], spec: LocalTableSpec<T>, query: TableQuery): TablePage<T> {
  const q = query.q.trim().toLowerCase();
  const facets = Object.entries(spec.facets ?? {});
  const kept = rows.filter(
    (row) =>
      (!q || !spec.search || spec.search(row).toLowerCase().includes(q)) &&
      facets.every(([id, facet]) => {
        const wanted = query.filters[id] ?? [];
        return wanted.length === 0 || facet.values(row).some((value) => wanted.includes(value));
      }),
  );

  const value = spec.sorts[query.sort.id];
  const compare = (a: T, b: T) => {
    if (!value) return 0;
    const [x, y] = [value(a), value(b)];
    // Empty values last, whichever the direction.
    if (x === null || x === "" || y === null || y === "") return (x === null || x === "" ? 1 : 0) - (y === null || y === "" ? 1 : 0);
    const result = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr");
    return query.sort.desc ? -result : result;
  };
  const key = query.groupBy ? spec.groupings?.[query.groupBy] : undefined;
  // Grouped, the groups come first, each sorted within.
  kept.sort((a, b) => (key ? key(a).localeCompare(key(b), "fr") : 0) || compare(a, b));

  const groups = key ? [...Map.groupBy(kept, key)].map(([each, items]) => ({ key: each, count: items.length })) : null;
  const folded = query.folded.filter((each) => groups?.some((group) => group.key === each));
  const layout = layoutTablePage(groups, kept.length, folded, query.page, query.pageSize);
  const visible = key ? kept.filter((row) => !folded.includes(key(row))) : kept;
  const take = layout.parts.reduce((sum, part) => sum + part.rows, 0);
  const counts = Object.fromEntries(
    facets.map(([id, facet]) => [id, Object.fromEntries(facet.options.map((option) => [option, rows.filter((row) => facet.values(row).includes(option)).length]))]),
  );
  return tablePageOf(layout, visible.slice(layout.before, layout.before + take), kept.length, counts);
}
