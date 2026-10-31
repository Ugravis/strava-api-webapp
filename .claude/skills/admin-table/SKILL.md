---
name: admin-table
description: Build or change a back-office list with the data table kit (DataTable, column builders, runTableQuery). Use whenever the user asks for an admin table, list or view of rows ("mon kit de table", "tableau admin", "une vue qui liste les utilisateurs/logs/…"), or to add a column, filter, grouping or action to one.
---

# Admin data table

1. Read `docs/admin-tables.md`. It holds the recipe, the config and builder reference, and the rules. Follow the rules as written.
2. Read `apps/frontend/src/app/(admin)/admin/development/admin-table/poc-columns.tsx`: a complete config using every feature.
3. Build the three layers, in this order:
   1. **Backend.**
      - A `GET …/table` route in the admin controller of the domain, taking `@TableQueryParam()`.
      - A `TableSpec`.
      - `runTableQuery`, then `mapTablePage`.
   2. **Server Action.** `fetchAdminTable` in the `actions.ts` of the page.
   3. **Config.** In a `"use client"` module, using the column builders, rendered by `<DataTable config={…} />` from the server page.
4. Match the ids exactly between the config and the spec:
   - each sortable column id ↔ `sorts`;
   - each facet id ↔ `facets`;
   - each grouping id ↔ `groupings`.
5. Pick one builder per kind of field: `textColumn`, `codeColumn`, `numberColumn`, `bytesColumn`, `dateColumn`, `booleanColumn`, `statusColumn`, `pillsColumn`, `iconsColumn`, `userColumn`, `lookColumn`, `buttonsColumn`, `orderColumn`. Use `customColumn` only when none fits. A kind of field that comes back across tables deserves a new cell and builder in the kit, rather than a custom column repeated.
6. Rows kept in an order of the database (badges, tags…): an `orderColumn` on the position, plus `reorder` in the config, a Server Action taking a `TableMove` (`{ id, after, before }`). Its backend route places the row right before `before`, else right after `after`, and numbers the order again, in one transaction. The position is a sort of the `TableSpec`. See « Order » in the doc.
7. Rows opened on click: skill `split-panel` for the panel, skill `admin-detail` for its content.
8. Check:
   - after a change of the kit, `pnpm --filter frontend test:visual`;
   - typecheck both apps;
   - `jest src/admin/common` in the backend;
   - then the page with agent-browser, signed in as the admin test account, including the URL state after a reload.
