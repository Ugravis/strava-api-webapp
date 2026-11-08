import { type MemoryTableSpec, serveTablePage, type TablePage, type TableQuery } from "@kilotrace/shared/table";

/** How to read the rows, the browser counterpart of the `TableSpec` of the backend. */
export interface LocalTableSpec<T> extends MemoryTableSpec<T> {
  /** A pause before answering, in ms, to mimic the network, e.g. in demos. */
  delay?: () => number;
}

/**
 * A `fetch` of a table over rows already in the browser, e.g. a short list
 * loaded at once, cut in pages exactly like the server does.
 */
export function localTableSource<T>(rows: T[], spec: LocalTableSpec<T>): (query: TableQuery) => Promise<TablePage<T>> {
  return (query) => {
    const page = serveTablePage(rows, spec, query);
    const delay = spec.delay?.() ?? 0;
    return delay > 0 ? new Promise((resolve) => setTimeout(() => resolve(page), delay)) : Promise.resolve(page);
  };
}
