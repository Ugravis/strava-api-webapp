/**
 * Contract of the data tables: what a table asks for, what the server
 * answers, and how a page is cut. Shared by the backend engine, the
 * frontend kit and its local source, so that all of them cut pages alike.
 */

/** Rows per page, unless a table says otherwise. */
export const TABLE_PAGE_SIZE = 30;
export const TABLE_MAX_PAGE_SIZE = 100;

export interface TableSort {
  id: string;
  desc: boolean;
}

/** By date of creation, newest first, unless a table says otherwise. */
export const TABLE_DEFAULT_SORT: TableSort = { id: "createdAt", desc: true };

/** What a table asks the server for. */
export interface TableQuery {
  q: string;
  /** Values kept per facet, any of them; no key or none for all. */
  filters: Record<string, string[]>;
  sort: TableSort;
  groupBy: string | null;
  /** Groups shown as their title only. */
  folded: string[];
  /** From 1. */
  page: number;
  pageSize: number;
}

export interface TableGroup {
  key: string;
  /** Rows of the group, folded or not. */
  count: number;
}

/** A line of a page: a row, or the title of its group. */
export type TableEntry<T> = { row: T } | { group: TableGroup };

/** One page of rows, as the server answers. */
export interface TablePage<T> {
  entries: TableEntry<T>[];
  /** Rows matching the search and filters. */
  total: number;
  /** Of them, the rows outside folded groups. */
  visible: number;
  /** The page served, within bounds. */
  page: number;
  pages: number;
  /** Rows on the pages before. */
  before: number;
  /** Rows per option of each facet, over the whole table. */
  counts: Record<string, Record<string, number>>;
}

/*
 * Wire format, the same in the URL of the API:
 * `?q=marie&sort=-createdAt&group=status&fold=active&page=2&size=30&f.status=active,suspended`.
 * Keys and values are identifiers: no commas inside.
 */

export function tableQueryToSearch(query: TableQuery): string {
  const params = new URLSearchParams();
  if (query.q.trim()) params.set("q", query.q.trim());
  params.set("sort", `${query.sort.desc ? "-" : ""}${query.sort.id}`);
  if (query.groupBy) params.set("group", query.groupBy);
  if (query.folded.length > 0) params.set("fold", query.folded.join(","));
  params.set("page", String(query.page));
  params.set("size", String(query.pageSize));
  for (const [facet, values] of Object.entries(query.filters)) {
    if (values.length > 0) params.set(`f.${facet}`, values.join(","));
  }
  return params.toString();
}

const first = (value: unknown): string | undefined => (Array.isArray(value) ? first(value[0]) : typeof value === "string" ? value : undefined);
const list = (value: unknown): string[] => (first(value) ?? "").split(",").filter(Boolean);
const integer = (value: unknown, fallback: number, max: number) => Math.min(Math.max(Math.trunc(Number(first(value))) || fallback, 1), max);

/**
 * A query read back from raw parameters, e.g. the query string of a request.
 * Lenient: it only shapes, the engine then keeps what its table knows.
 */
export function tableQueryFromSearch(raw: Record<string, unknown>, defaultSort: TableSort = TABLE_DEFAULT_SORT): TableQuery {
  const sort = first(raw.sort);
  const filters: Record<string, string[]> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (key.startsWith("f.") && key.length > 2) filters[key.slice(2)] = list(value);
  }
  return {
    q: (first(raw.q) ?? "").trim().slice(0, 200),
    filters,
    sort: sort ? { id: sort.replace(/^-/, ""), desc: sort.startsWith("-") } : defaultSort,
    groupBy: first(raw.group) || null,
    folded: list(raw.fold),
    page: integer(raw.page, 1, 100_000),
    pageSize: integer(raw.size, TABLE_PAGE_SIZE, TABLE_MAX_PAGE_SIZE),
  };
}

/** A run of a page: the rows of one group, after its title or not. */
export interface TablePart {
  /** Null on a table without groups. */
  group: TableGroup | null;
  /** The title of the group opens the run: at its start, or again at the top of a page. */
  title: boolean;
  rows: number;
}

export interface TableLayout {
  page: number;
  pages: number;
  /** Rows on the pages before, so the offset of the first row to fetch. */
  before: number;
  visible: number;
  parts: TablePart[];
}

/**
 * Cuts the rows into pages from the size of each group alone, before any
 * row is fetched. A folded group keeps its title only, out of the count; a
 * group cut by a page repeats its title on the next.
 * `groups` in the order of the rows; null on a table without groups.
 */
export function layoutTablePage(groups: TableGroup[] | null, total: number, folded: string[], page: number, pageSize: number): TableLayout {
  const pages: TablePart[][] = [[]];
  let visible = 0;
  for (const group of groups ?? [{ key: "", count: total }]) {
    const own = groups ? group : null;
    const shown = folded.includes(group.key) ? 0 : group.count;
    if (shown > 0 && visible > 0 && visible % pageSize === 0) pages.push([]);
    let part: TablePart = { group: own, title: !!own, rows: 0 };
    pages.at(-1)!.push(part);
    let left = shown;
    while (left > 0) {
      if (left < shown && visible % pageSize === 0) {
        part = { group: own, title: !!own, rows: 0 };
        pages.push([part]);
      }
      const take = Math.min(pageSize - (visible % pageSize), left);
      part.rows += take;
      visible += take;
      left -= take;
    }
  }
  const index = Math.min(Math.max(page, 1), pages.length) - 1;
  const rowsOf = (parts: TablePart[]) => parts.reduce((sum, part) => sum + part.rows, 0);
  return {
    page: index + 1,
    pages: pages.length,
    before: pages.slice(0, index).reduce((sum, parts) => sum + rowsOf(parts), 0),
    visible,
    parts: pages[index]!.filter((part) => part.title || part.rows > 0),
  };
}

/** The rows of a page, fetched in order, set between the titles of their groups. */
export function tablePageOf<T>(layout: TableLayout, rows: T[], total: number, counts: TablePage<T>["counts"]): TablePage<T> {
  const entries: TableEntry<T>[] = [];
  let next = 0;
  for (const part of layout.parts) {
    if (part.title && part.group) entries.push({ group: part.group });
    for (const row of rows.slice(next, next + part.rows)) entries.push({ row });
    next += part.rows;
  }
  return { entries, total, visible: layout.visible, page: layout.page, pages: layout.pages, before: layout.before, counts };
}

/** The same page with its rows mapped, e.g. entities to the shape of the API. */
export async function mapTablePage<T, U>(page: TablePage<T>, map: (rows: T[]) => Promise<U[]> | U[]): Promise<TablePage<U>> {
  const rows = page.entries.flatMap((entry) => ("row" in entry ? [entry.row] : []));
  const mapped = await map(rows);
  let next = 0;
  return { ...page, entries: page.entries.map((entry) => ("row" in entry ? { row: mapped[next++]! } : entry)) };
}

/** How to read rows held in memory, the counterpart of the SQL `TableSpec` of the backend. */
export interface MemoryTableSpec<T> {
  /** The text matched by the search, case-insensitively. */
  search?: (row: T) => string;
  /** Per sortable column; empty values last, whichever the direction. */
  sorts: Record<string, (row: T) => string | number | null>;
  /** Per facet: the values of the row; a row is kept when any is picked. */
  facets?: Record<string, { options: string[]; values: (row: T) => string[] }>;
  /** Per grouping: the key of the group of the row. */
  groupings?: Record<string, (row: T) => string>;
}

/**
 * A page of rows held in memory, cut exactly like the SQL engine does: the
 * same search, filters, sort, groups and pages.
 */
export function serveTablePage<T>(rows: readonly T[], spec: MemoryTableSpec<T>, query: TableQuery): TablePage<T> {
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

  const counted = new Map<string, number>();
  if (key) for (const row of kept) counted.set(key(row), (counted.get(key(row)) ?? 0) + 1);
  const groups = key ? [...counted].map(([each, count]) => ({ key: each, count })) : null;
  const folded = query.folded.filter((each) => groups?.some((group) => group.key === each));
  const layout = layoutTablePage(groups, kept.length, folded, query.page, query.pageSize);
  const visible = key ? kept.filter((row) => !folded.includes(key(row))) : kept;
  const take = layout.parts.reduce((sum, part) => sum + part.rows, 0);
  const counts = Object.fromEntries(
    facets.map(([id, facet]) => [id, Object.fromEntries(facet.options.map((option) => [option, rows.filter((row) => facet.values(row).includes(option)).length]))]),
  );
  return tablePageOf(layout, visible.slice(layout.before, layout.before + take), kept.length, counts);
}
