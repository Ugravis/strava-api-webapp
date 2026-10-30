import type { Entry, PocPage, PocRequest, PocTableConfig } from "./poc-table";

/**
 * Stands for the API: searches, filters, sorts, groups and cuts the page
 * the table asks for, after a network-like delay.
 */
export function serve<T>(rows: T[], config: PocTableConfig<T>, request: PocRequest): Promise<PocPage<T>> {
  const q = request.query.trim().toLowerCase();
  const column = config.columns.find((each) => each.id === request.sort.id);
  const grouping = config.groupings?.find((each) => each.id === request.groupBy);
  const kept = rows.filter(
    (row) =>
      (!q || config.search.text(row).toLowerCase().includes(q)) &&
      (config.facets ?? []).every((facet) => {
        const wanted = request.filters[facet.id] ?? [];
        return wanted.length === 0 || facet.values(row).some((value) => wanted.includes(value));
      }),
  );
  const compare = (a: T, b: T) => {
    if (!column?.sortValue) return 0;
    const [x, y] = [column.sortValue(a), column.sortValue(b)];
    const result = typeof x === "number" && typeof y === "number" ? x - y : String(x).localeCompare(String(y), "fr");
    return request.sort.desc ? -result : result;
  };
  // Grouped, the groups come first, each sorted within.
  kept.sort((a, b) => (grouping ? grouping.key(a).localeCompare(grouping.key(b), "fr") : 0) || compare(a, b));

  // A folded group keeps its title only, out of the count, and a group cut
  // by a page repeats its title on the next.
  const list: Entry<T>[][] = [[]];
  let visible = 0;
  const groups = grouping ? Map.groupBy(kept, grouping.key) : new Map([["", kept]]);
  for (const [key, items] of groups) {
    const title = { key, count: items.length };
    const shown = request.folded.includes(key) ? [] : items;
    if (shown.length > 0 && visible > 0 && visible % request.pageSize === 0) list.push([]);
    if (grouping) list.at(-1)!.push({ title });
    shown.forEach((row, index) => {
      if (index > 0 && visible % request.pageSize === 0) list.push(grouping ? [{ title }] : []);
      list.at(-1)!.push({ row });
      visible += 1;
    });
  }

  const page = Math.min(Math.max(request.page, 1), list.length);
  const counts = Object.fromEntries(
    (config.facets ?? []).map((facet) => [
      facet.id,
      Object.fromEntries(facet.options.map((option) => [option.value, rows.filter((row) => facet.values(row).includes(option.value)).length])),
    ]),
  );
  const result: PocPage<T> = {
    entries: list[page - 1]!,
    total: kept.length,
    visible,
    page,
    pages: list.length,
    before: list.slice(0, page - 1).reduce((sum, entries) => sum + entries.filter((entry) => "row" in entry).length, 0),
    counts,
  };
  return new Promise((resolve) => setTimeout(() => resolve(result), 300 + Math.random() * 400));
}
