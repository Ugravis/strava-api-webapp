# Admin detail content

The content of a detail of the back office: what the split panel (`docs/split-panel.md`) shows of a row, and the same blocks in a dialog or a page. The panel draws its own header (back, forward, title, fold, mode, close); these blocks are what goes inside. Showcase: `/admin/development/admin-table`, a click on a row of either table (`poc-detail.tsx`, `poc-badge-detail.tsx`).

## Where things are

| Path | Role |
| --- | --- |
| `apps/frontend/src/components/admin/detail/` (import from `@/components/admin/detail`) | The blocks below. Client side. |
| `apps/frontend/src/components/admin/data-table/` | The cells drawing the values: the detail depends on the table kit, never the other way. |

## Blocks

| Block | Use |
| --- | --- |
| `DetailCover` | A large image across the top, above the header, opened whole on click; a grey band without an image, so that every row of a detail with a cover has one. |
| `DetailHeader` | `media` (avatar, icon), `title`, `subtitle`, `marks` beside the title, `actions` on the right (icon buttons). |
| `DetailMedia` | The `media` of a header told by an icon: a large disc in the look of the first column of its table, `background` filling it or `color` tinting the icon. |
| `DetailSection` | A part under a small uppercase `title`, `pill` right after it (`{ icon, label, tone }`, the tones of the table pills, e.g. « Modération » in amber), `aside` on its right; a line between sections. `tone`: `danger` (e.g. a suspension). |
| `DetailColumnFields` | The fields of a row as its table draws them: `row`, the `columns` of its `DataTableConfig`, the `ids` to show in order. Name, icon, cell and copy button of each column. |
| `DetailColumnField` | One of them, `id`: in a `DetailFields` among free fields, so that a section keeps a single list. `edit` edits it in place as a `DetailField` (`{ id, edit }` in `DetailColumnFields`), the value still drawn by its column, e.g. a collection picked in a list, categories in a list of several. Drawn whole: every item of a list (pills, icons) shown and wrapping, none counted as « +n ». |
| `DetailFields` + `DetailField` | Free fields: `label`, `icon`, the value as children, « — » when empty. On hover, buttons float at the right of the value: `tools` (any `DetailFieldButton`), copy (a text or a number shown is copied as is; `copy` gives the text of any other value, `null` none), edit (`edit`). `edit` edits in place, after its `kind` (below): the pencil only, never a click on the value, opens a field or a popover; Enter (⌘ Enter on several lines), ✓, leaving the field or closing the popover saves (a colour or an image by « Valider » only), Esc or ✕ gives up (the panel stays open); `onSave(value) => Promise<ActionResult \| void>`, `{ ok: false }` keeping the field open, its message in a toast. Without children the value is drawn after its kind. Nothing is ever left unsaved, so nothing guards the closing of the panel. While a popover is open its pencil stays shown, pressed, and closes it again, giving up. An editable field shows a small dark pencil at the top right of its label, unless `editHint={false}` (`{ id, edit, editHint: false }` in `DetailColumnFields`). `stacked`: the value under its label, across the whole width, wrapping (a long text), its buttons at the top right of the panel; in `DetailColumnFields`, `{ id, stacked: true }`. |
| `DetailItems` + `DetailItem` | Several values of one field, one per line: `icon` in a grey square on the left, as in the icon cells of the tables, the text, `actions` (`DetailItemButton`s, always in sight) on the right. As the value of a `DetailField` (beside its label, or under it across the whole width with `stacked`), or alone in a section. |
| `DetailItemButton` | An icon button of the `actions` of a `DetailItem`, in the look of the floating buttons of the fields (border, background), named in a bubble. |
| `DetailActions` + `DetailAction` | A row of buttons on a single line, a line above it: under the header, or between sections. The buttons share the whole width; when their names no longer fit, they show their icon only, named in a bubble after 400 ms. `sticky`: at the bottom of the panel, staying in sight as the detail scrolls (last child of the detail). `DetailAction`: `label`, `icon`, `variant` (`outline`, `default`, `destructive`), `onClick` or `href` (a new tab); outside `DetailActions` (e.g. the `actions` of `DetailHeader`), its icon alone with its bubble. |
| `LucideIconByName` | A Lucide icon by its name (`rocket`, `grid-3x3`), all of them loaded in a chunk of their own the first time one is drawn: e.g. the `icon` of a `DetailMedia` whose icon is edited. |
| `DetailFieldButton` | A button floating at the right of a field on hover, in the look of the copy button of the tables, named in a bubble: the `tools` of a `DetailField`, before copy and edit. |
| `DetailTimeline` + `DetailTimelineItem` | Dated events along a line, the latest first: `icon`, `tone` (`default`, `green`, `red`, `amber`, `blue`), `title`, `date` (ISO, relative, exact on hover), details as children. |
| `DetailLoader` | Loads the row of `id` with `load(id)`, then draws `children(row)`: `DetailSkeleton` meanwhile (or `skeleton`), « Introuvable » when `load` answers null, « Réessayer » when it fails. Another id goes back to the skeleton; a new `refreshKey` loads again in the background, the detail shown meanwhile. |
| `DetailSkeleton` | While the detail loads, in the geometry of its blocks: `cover`, `media`, `actions` (buttons of a `DetailActions` under the header), `sections` (fields of each; `fields` for one). Mirror the detail, so that nothing jumps once loaded. |
| `DetailEmpty` | Nothing to show: the row is gone, or the call failed; `action` e.g. a retry button. |

## In-place edits

`edit` of `DetailField` / `DetailColumnField`, by its `kind` (`DetailFieldEdit`, `text` when none). `DetailField` is generic on it: the value given to `onSave` is typed.

| `kind` | Value | Edited in | Options |
| --- | --- | --- | --- |
| `text` (none) | `string \| null` | A field; saved by Enter, ✓ or leaving it | `multiline` (⌘ Enter saves), `placeholder` |
| `number` | `number \| null` | A field; refused out of bounds, in a toast | `min`, `max`, `step`, `unit` (after the value) |
| `date` | `YYYY-MM-DD`; with `time`, an ISO instant | The date field of the browser (its time zone) | `time`, `min`, `max` |
| `select` | `string \| null` | A popover titled « (sélection unique) »: the options, a search beyond 8; a click saves | `options`, `noneLabel` (the choice of none) |
| `multiselect` | `string[]`, in the order of the options | A popover of checks, titled « (sélection multiple) »; « Valider » or closing it saves | `options` |
| `color` | `#rrggbb \| null` | A popover: a swatch, any hue (pipette, code) or none, saved by « Valider » only; closing it gives up | `presets`, `noneLabel` |
| `icon` | A Lucide name, e.g. `rocket` | A popover: every Lucide icon, searched by name, 96 shown at once; a click saves | `noneLabel` |
| `image` | The URL shown, `string \| null`; `onSave` given a `File`, or `null` once removed | A popover: the image, replaced by a file picked or dropped, refused beyond `maxSize` in a toast; saved by « Valider » only, « Annuler » or closing it gives up; widened from its bottom left corner. The Server Action uploads it and answers the row with its new URL | `accept` (PNG, JPEG, WebP by default), `maxSize` (bytes), `noneLabel` (removes it) |
| `switch` | `boolean` | The switch itself, saved as soon as switched; no pencil | |

Options: `{ value, label, icon?, tone? }`, a `tone` drawing it as a pill of the tables. A value cleared that the API refuses answers `{ ok: false }`, the field staying open.

## Rules

- **Loading.** The panel opens at once on the skeleton: pass `<RowPanel id={row.id} />` to `open`, a component that reads its `refreshKey` (a version bumped by every save) and wraps the detail in `DetailLoader`. The same `refreshKey` goes to the `DataTable`, so that a save in the detail shows in the list, and the reverse. The API answers new objects: rows are memoized on their object.

- **Images.** Large: `DetailCover` first in the detail. Small: the `imageColumn` of the table in `DetailColumnFields`, a thumbnail beside the name of the field, opened whole on click. Both may show the same image.

- **Same look as the list.** A value shown in the table goes through `DetailColumnFields` / `DetailColumnField`, never formatted again by hand: same status dot, pills, dates, copy on hover.
- **Everything.** Every field the API answers for the row is shown, and every value can be copied.
- **Buttons.** Always `DetailAction`: an icon alone always has its bubble.
- **Full width.** Values let go of the widths of their table column; still cut at the panel's width, whole in a bubble on hover.
- **No panel chrome.** No close button, no title bar, no outer padding: the panel or the page brings them.
- **Text.** French, written by the page.
