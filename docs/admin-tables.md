# Admin data tables

Every list of the back office is a `DataTable`: one header of search, filters and tools, rows served page by page by the API, a pagination. The design was settled on a POC (#133): its original code is the git tag `admin-table-poc-v1`, its captures are on the page Développement (`/admin/development`), and its demo, rebuilt on the kit, stays at `/admin/development/admin-table` as the live showcase on fake rows.

## Where things are

| Layer | Path | Role |
| --- | --- | --- |
| Contract | `packages/shared/src/table/index.ts` (`@kilotrace/shared/table`) | `TableQuery`, `TablePage`, wire format, page layout. Browser-safe. |
| Backend engine | `apps/backend/src/admin/common/table-query.ts` | `runTableQuery`, `TableSpec`, `@TableQueryParam()`. Rows held in memory (e.g. from an outside API): `serveTablePage` of the contract. |
| Server Action helper | `apps/frontend/src/lib/admin/table.ts` | `fetchAdminTable(path, query)`. |
| Frontend kit | `apps/frontend/src/components/admin/data-table/` (import from `@/components/admin/data-table`) | `DataTable`, column builders, cells, `localTableSource`. |
| Showcase | `apps/frontend/src/app/(admin)/admin/development/admin-table/` | Every feature on fake accounts: copy it. |
| Visual tests | `apps/frontend/e2e/admin-table.spec.ts` | Captures of every state of the showcase. |

## Recipe: a new table

Example: the accounts, rows of type `AdminUserSummary`.

### 1. Backend: an endpoint serving pages

In the existing admin controller of the domain (its guards and permissions then apply):

```ts
@Get('table')
table(@TableQueryParam() query: TableQuery): Promise<TablePage<AdminUserSummary>> {
  return this.service.table(query);
}
```

In the service, a `TableSpec` of SQL expressions on the aliases of the query builder, and the base query of every row the caller may see, without order:

```ts
const ACTIVE = '(user.suspended_at IS NULL OR user.suspended_until <= now())';

const USERS_TABLE: TableSpec = {
  search: ['user.username', 'user.display_name', 'user.email'],
  sorts: {
    createdAt: 'user.created_at',
    user: 'user.username',
    lastSeenAt: '(SELECT MAX(s.last_seen_at) FROM sessions s WHERE s.user_id = "user"."id")',
  },
  tiebreak: 'user.id',
  facets: {
    country: { column: 'user.country_code' },
    status: { options: { active: ACTIVE, suspended: `NOT ${ACTIVE}` } },
  },
  groupings: { status: `CASE WHEN ${ACTIVE} THEN 'active' ELSE 'suspended' END` },
};

async table(query: TableQuery): Promise<TablePage<AdminUserSummary>> {
  const page = await runTableQuery(this.users.createQueryBuilder('user'), query, USERS_TABLE);
  return mapTablePage(page, (users) => this.summaries(users));
}
```

- The ids of `sorts`, `facets` and `groupings` are those of the columns, facets and groupings of the frontend config. Anything else the client asks for is ignored.
- Sorting puts empty values last, whichever the direction. `tiebreak` must be unique.
- A facet is either a `column` of single values, counted per value, or one SQL condition per option. Use options for a value spread over rows, e.g. `EXISTS (SELECT 1 FROM provider_connections c WHERE c.user_id = "user"."id")`.
- Facet counts are taken over the whole base query, before search and filters.
- The joins of the base query must be to-one. A to-many join would repeat rows: filter on those through `EXISTS` instead.
- The key of a group is the text of its expression; `NULL` becomes `''`.
- `mapTablePage` maps the entities to the shape of the API, all rows of the page at once.
- Test the spec on the dev database. The pure parts are covered by `table-query.spec.ts`.

### 2. Frontend: the Server Action

The browser never calls `/api/admin` itself (the proxy blocks it), so `fetch` is a Server Action, next to the page in `actions.ts`:

```ts
"use server";

export async function fetchUsersTable(query: TableQuery): Promise<TablePage<AdminUserSummary>> {
  return fetchAdminTable<AdminUserSummary>("/users/table", query);
}
```

A failed call throws, and the table shows its error state with a retry button. A scope of the page outside the picks of the table, e.g. `?target=` on the logs, goes as the third argument: `fetchAdminTable(path, query, { target })`.

### 3. Frontend: the config and the table

Put them in a `"use client"` module, e.g. `users-table.tsx`:

```tsx
const USERS: DataTableConfig<AdminUserSummary> = {
  id: "users",
  fetch: fetchUsersTable,
  rowId: (user) => user.id,
  search: "Nom, @username ou e-mail",
  noun: (count) => (count > 1 ? "comptes" : "compte"),
  empty: { title: "Aucun compte", description: "Les comptes apparaîtront ici dès la première inscription." },
  columns: [
    userColumn({ id: "user", header: "Utilisateur", icon: <AtSignIcon />, sortable: true, value: (user) => user }),
    statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, value: (user) => user.status, statuses: STATUSES }),
    textColumn({ id: "email", header: "E-mail", icon: <MailIcon />, value: (user) => user.email, muted: true }),
    dateColumn({ id: "createdAt", header: "Inscription", icon: <CalendarPlusIcon />, sortable: true, value: (user) => user.createdAt }),
    dateColumn({ id: "lastSeenAt", header: "Dernière visite", icon: <ClockIcon />, sortable: true, value: (user) => user.lastSeenAt, relative: true }),
  ],
  facets: [{ id: "status", label: "Statut", options: [{ value: "active", label: "Actif" }, { value: "suspended", label: "Suspendu" }] }],
  groupings: [{ id: "status", label: "Statut", title: (key) => STATUSES[key].label }],
};

export function UsersTable() {
  return <DataTable config={USERS} />;
}
```

The page, a server component, checks access and renders `<UsersTable />`.

- `config` must be stable: a module constant, or a `useMemo`. A new `fetch` on each render would fetch on each render.
- When the config needs hooks, e.g. `useRouter` for `onOpen`, build it inside the component with `useMemo`.

### Without a server: `localTableSource`

For a short list already loaded in full, or a demo, `fetch: localTableSource(rows, spec)` serves the same pages in the browser. `spec` mirrors the `TableSpec`, with functions instead of SQL (see `poc-columns.tsx`). The same cut is `serveTablePage(rows, spec, query)` in `@kilotrace/shared/table`, for a backend serving rows it does not read from SQL, e.g. the commits of GitHub.

## Config reference (`DataTableConfig<T>`)

| Key | Use |
| --- | --- |
| `id` | Prefix of the URL keys. Unique on the page. |
| `fetch`, `rowId`, `columns`, `empty`, `noun` | Required. |
| `search` | Placeholder of the search field. No field without it. |
| `facets` | Filter buttons of the header. |
| `groupings` | The « Grouper » menu. Its titles fold their group. |
| `defaultGroupBy` | A grouping applied by the system; « Aucun » then joins the menu. |
| `views` | Any number of views, the first one the default. Each has a free `label`, a `layout` (`table` by default, `cards`, `list`) whose icon it takes (a small grid for a table of up to 5 columns), a subset of `columns`, its own `pageSize`, `noSelection` / `noActions` to drop the checkboxes or the row menu, and `params` sent to `fetch` as its second argument when the view changes the rows themselves, e.g. `{ branch: "develop" }`. Two tables of other columns and cards, or a single table: as wanted. |
| `create` | The blue « Nouveau » button. |
| `defaultSort` | `createdAt` descending unless said otherwise. |
| `defaultFilters` | Applied by the system, shown active only once the user picks. |
| `pageSize` | Else the default of the layout: 30 for a table, 24 for cards, 60 for a list. At most 100. A view's own `pageSize` wins. |
| `maxHeight` | Most height of the box, in every layout, any CSS length (`"480px"`, `"calc(100dvh - 12rem)"`); `70vh` by default; `"none"` grows without a scroll of its own. |
| `bulkActions` | Checkboxes on the rows, plus a bottom bar with these buttons. |
| `actions` | The `RowActions` menu at the end of the row. |
| `onOpen` | Click on a row. Buttons, links and checkboxes keep their own click. |
| `muted` | Greyed rows. |
| `reorder` | Saves a row moved by the handle of an `orderColumn`: `(move: TableMove) => Promise<ActionResult>`. Only for rows kept in an order of the database. |

## Columns: one builder per kind of field

Each builder applies the rules of the kit: the cell of its kind, a copy button on every value of text or numbers, a skeleton of its shape, and `EmptyValue` (—) for a missing value. Every builder takes `id`, `header`, `icon`, and optionally `sortable`, `locked`, `className` and `href`.

| Builder | Field | Cell |
| --- | --- | --- |
| `userColumn({ value, marks?, empty?, avatar? })` | An account: avatar (`avatar: false` when an `imageColumn` shows it), @username, `Mark`s. Locked, copies the username. No account shows `empty` (e.g. « Système »), else a dash; a deleted one (no username) « Compte supprimé ». | `UserCell` |
| `lookColumn({ value, marks? })` | An item told by its look: icon in a disc (`background` or icon `color`), name, `Mark`s. Locked, copies the name. Badges, tags. | `LookCell` |
| `textColumn({ value, muted?, width? })` | Free text, e-mail (`muted`). Truncated with the whole text in a bubble. Copied. | `TextCell` |
| `codeColumn({ value, width? })` | Id, key, hash, in monospace. Copied. | `CodeCell` |
| `numberColumn({ value, zero?, unit? })` | A count. `0` shows as empty unless `zero`. Copied. | `NumberCell` |
| `bytesColumn({ value })` | A weight of files, e.g. « 1,4 Mo ». Copied. | `BytesCell` |
| `dateColumn({ value, time?, relative?, now? })` | A date, a date and time, or how long ago (`relative`, exact date on hover). | `DateCell`, `RelativeDateCell` |
| `imageColumn({ value })` | An image `{ src, alt }`: a cover, a capture. A thumbnail in a table and a list; in cards, the first one after the title is the cover at the top of the card, as the card preview of Notion, light grey without an image. A click opens it whole in a popup. | `ImageCell`, `ImageCover` |
| `booleanColumn({ value })` | Yes as a check, no as empty. | `BooleanCell` |
| `statusColumn({ value, statuses })` | A state among a few: a dot of colour and a label. | `StatusCell` |
| `pillsColumn({ value, max? })` | Labels among many: coloured pills, the rest counted. | `PillsCell` |
| `iconsColumn({ value, max? })` | Things told by an icon: connections, tags. | `IconsCell` |
| `buttonsColumn({ buttons, count? })` | Quick actions: `CellButtons` of `CellButton`s. | — |
| `orderColumn({ value })` | The place of the row in an order of the database, e.g. badges, tags. Sortable, `grip-vertical` icon by default, `compact`: a narrow column, the number small and light; with `reorder`, a drag handle before it. In cards and list, drawn before the title rather than as a value. | `OrderCell` |
| `customColumn(column)` | Anything else: its own `cell`, plus `copy` / `skeleton` if relevant. | — |

Other bits:

- `Truncate`: always give it a `max-w-*`.
- `Mark`: a small icon pill beside a name, e.g. a role or a suspension.
- `LinkCell`: a link of its own text, e.g. `#99` to a pull request.
- `Tip`: the bubble of every icon-only button.
- `formatDate`, `formatDateTime`, `formatRelative`, `formatNumber`, `formatBytes`: French, Paris time.
- Colours go through `Tone`: `gray`, `green`, `red`, `amber`, `blue`, `violet`, `sky`, `cyan`, `fuchsia`. No raw colour classes in configs.

## Rules

- **Icons.** Every column has a lucide icon before its name. Every icon-only button has a `Tip`.
- **Outside links.** A value opening an outside page (GitHub, Strava…) takes `href: (row) => url | null`: it opens in a new tab and is underlined on hover, in every layout. The row keeps its own click elsewhere. Inside the app, a `LinkCell` in a `customColumn`.
- **Copy.** Every value made of text or numbers gets a copy button on hover (the builders do it): texts, numbers, accounts, looks, statuses (their label), pills and icons (all their names), dates (the exact date and time, even when shown relative). Images, checks, buttons and the order don't. A `customColumn` showing text gives its `copy`.
- **Server-driven.** Search (debounced 250 ms), filters, sort, groups, folds and pages all go through `fetch`. Skeleton rows show while it runs; the last page keeps the counts and the pagination. While a call runs, every control that changes the rows is disabled (the search field stays editable, the typing only restarts the pause), and the skeleton keeps the widths of the columns.
- **Defaults vs picks.** A header button turns blue only when the user picked it, even when the pick equals the default. Resetting hands control back to the system. « Grouper » has no « Aucun »: its reset item does that.
- **URL.** Every pick is in the URL under the table id: `<id>.q`, `<id>.f.<facet>`, `<id>.sort` (`-` for descending), `<id>.group` (`-` for none against a `defaultGroupBy`), `<id>.fold`, `<id>.hide`, `<id>.show`, `<id>.view`, `<id>.page`. Pinning the first column is not kept.
- **Ids.** Ids of columns, facets, options and groupings are identifiers: no commas.
- **Layout.**
  - The box grows with its rows up to `maxHeight` (`70vh` by default), then scrolls, in every layout. The header of a table is sticky.
  - Cards and list draw the cells of the columns, no layout of their own: a card stacks the values one under the other, each after the icon of its column; an item of the list sets them side by side, and the items follow each other on the line. The first column is set apart: header of the card, bold in the list. An `orderColumn` goes before it, after the checkbox.
  - The first column is pinned (toggle in the header); never on a phone.
  - Under 640 px, the header folds onto two lines.
  - On a narrow desktop, the details of the tools hide when they would wrap the header.
- **Text.** French, written into the kit.
- **Actions.** The row menu uses `RowActions`, always shown. Its column header is an icon.
- **Filters.** A facet menu stays open while options are ticked.
- **Order.** With an `orderColumn` and `reorder`, rows move by their handle, in every layout (up and down in a table, any way in cards and list), with the mouse, a finger or the keyboard (Space, arrows, Space), within their group and their page. Hiding the order column hides the handles. Only once sorted by that column (either way), without search or filters, and not while a move saves: the handle is greyed otherwise, its bubble telling why. The new order shows at once; the page is then fetched again without skeleton, a failure told by a toast. `TableMove` gives the new neighbours on the page in ascending order: the server places the row right before `before`, else right after `after`, and numbers its order again.
- **Sort.** « Trier » shows only with a sortable column, e.g. not on the commits, which GitHub serves in its own order.
- **Columns.** The « Colonnes » menu lists the columns of every view: those of the current view can be hidden (`hide`), those of the others shown (`show`). « Trier » lists every sortable column. The column of the current grouping (same id, not locked), `defaultGroupBy` included, is hidden by the system: its group titles already tell its value. Ticking it again shows it (`show`), whatever the grouping.

## Not in the kit

Short lists reordered by drag and drop without a table keep `components/admin/sortable-list.tsx`.

## Visual tests

`apps/frontend/e2e/admin-table.spec.ts` photographs every state of the showcase:
- table;
- grouped, filtered and sorted;
- overview;
- cards;
- list;
- loading;
- empty;
- error;
- ordered rows, handles blocked by another sort;
- selection;
- phone.

They run against the running dev stack, signed in as the admin test account. Local only: the CI has no stack.

```bash
pnpm --filter frontend exec playwright install chromium   # once
pnpm --filter frontend test:visual                         # compare
pnpm --filter frontend test:visual:update                  # accept a wanted change of design
```

Run them after any change of the kit. A failure means a pixel moved: check `test-results/` for the expected, actual and diff images.
