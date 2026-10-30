import type { TablePage, TableQuery, TableSort } from "@kilotrace/shared/table";
import type { ReactNode } from "react";

export type { TableEntry, TableGroup, TablePage, TableQuery, TableSort } from "@kilotrace/shared/table";

/** A column. Prefer the builders of `columns.tsx`, which apply the rules of the kit. */
export interface DataTableColumn<T> {
  /** Also the id the server sorts by. */
  id: string;
  header: string;
  /** Before the name of the column: a lucide icon, required by the rules. */
  icon: ReactNode;
  cell: (row: T) => ReactNode;
  /** The server knows how to sort by it. */
  sortable?: boolean;
  /** Shape of its cells while loading, a bar by default. */
  skeleton?: ReactNode;
  /** Out of the columns menu, always shown: the first column, mostly. */
  locked?: boolean;
  /** The text a floating button copies on hover, none when null. */
  copy?: (row: T) => string | null;
  className?: string;
}

/** A filter of the header: the rows having any of the values picked. */
export interface DataTableFacet {
  id: string;
  label: string;
  options: { value: string; label: string; icon?: ReactNode }[];
}

/** A way to group the rows, under foldable titles. */
export interface DataTableGrouping {
  id: string;
  label: string;
  /** The title of a group from its key, as the server sends it. */
  title: (key: string) => ReactNode;
}

/**
 * How a view draws its rows, always with the cells of the columns: a table,
 * cards of values one under the other, or items of values side by side,
 * following each other on the line.
 */
export type DataTableLayout = "table" | "cards" | "list";

/**
 * A way to show the rows: any layout, with all or some columns. Its name is
 * free, its icon is that of its layout: several tables of other columns
 * look alike in the menu.
 */
export interface DataTableView {
  id: string;
  label: string;
  /** A table by default. */
  layout?: DataTableLayout;
  /** Shown columns, all by default. */
  columns?: string[];
  /** Rows per page, else the `pageSize` of the config, else the default of the layout. */
  pageSize?: number;
  /** Without the checkboxes of `bulkActions`, e.g. a list of short items. */
  noSelection?: boolean;
  /** Without the menu of `actions`. */
  noActions?: boolean;
}

export interface DataTableConfig<T> {
  /** Names its parameters in the URL, unique on the page. */
  id: string;
  /** Asks the server for a page: a Server Action, or `localTableSource`. */
  fetch: (query: TableQuery) => Promise<TablePage<T>>;
  rowId: (row: T) => string;
  /** The first one stays on screen while the table scrolls sideways. */
  columns: DataTableColumn<T>[];
  /** Placeholder of the search field, e.g. what it searches; no field without it. */
  search?: string;
  facets?: DataTableFacet[];
  groupings?: DataTableGrouping[];
  /** The first one is the default. */
  views?: DataTableView[];
  /** The main action of the list, e.g. to add an item. */
  create?: { label: string; onClick: () => void };
  /** By date of creation, newest first, unless said otherwise. */
  defaultSort?: TableSort;
  /** Applied by the system, shown active only once the user picks. */
  defaultFilters?: Record<string, string[]>;
  /** Rows per page, else the default of the layout: 30 for a table, 24 for cards, 60 for a list. */
  pageSize?: number;
  /**
   * Most height of the box of a table, which grows with its rows up to it:
   * any CSS length, e.g. `"480px"` or `"calc(100dvh - 12rem)"`; 70vh by
   * default. `"none"` lets it grow without a scroll of its own.
   */
  maxHeight?: string;
  /** Buttons on the selected rows, in a bar at the bottom; rows get checkboxes with it. */
  bulkActions?: (ids: string[], clear: () => void) => ReactNode;
  /** Greyed rows, e.g. hidden entries. */
  muted?: (row: T) => boolean;
  /** Icon buttons or a menu, at the end of the row: `RowActions` mostly. */
  actions?: (row: T) => ReactNode;
  /** A click on the row, e.g. to open its panel. */
  onOpen?: (row: T) => void;
  empty: { title: string; description: string };
  /** The rows counted, e.g. `(count) => (count > 1 ? "comptes" : "compte")`. */
  noun: (count: number) => string;
}

/*
 * The choices of the user, apart from the defaults of the system: null (or
 * no key) until the user picks, even the default, which the header then
 * shows as active. A reset hands back to the system.
 */
export interface DataTablePicks {
  filters: Record<string, string[]>;
  sort: TableSort | null;
  groupBy: string | undefined;
  hidden: Set<string> | null;
}
