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
| `DetailSection` | A part under a small uppercase `title`, `aside` on its right; a line between sections. `tone`: `danger` (e.g. a suspension), `warning` (e.g. a note of the team). |
| `DetailColumnFields` | The fields of a row as its table draws them: `row`, the `columns` of its `DataTableConfig`, the `ids` to show in order. Name, icon, cell and copy button of each column. |
| `DetailFields` + `DetailField` | Free fields: `label`, `icon`, the value as children, « — » when empty. On hover, buttons float at the right of the value: `tools` (any `DetailFieldButton`), copy (`copy`, the text it copies), edit (`edit`). `edit: { value, onSave, multiline, placeholder }` edits in place: a click on the value or the pencil opens a field; Enter (⌘ Enter on several lines), ✓ or leaving the field saves, Esc or ✕ gives up (the panel stays open); `onSave(value) => Promise<ActionResult \| void>`, `{ ok: false }` keeping the field open, its message in a toast. Without children the value shows `edit.value`. Nothing is ever left unsaved, so nothing guards the closing of the panel. `stacked`: the value under its label, across the whole width, wrapping (a long text), its buttons at the top right of the panel; in `DetailColumnFields`, `{ id, stacked: true }`. |
| `DetailItems` + `DetailItem` | Several values of one field, one per line: `icon` (or a picture) on the left, the text, `actions` (icon buttons, `size="icon-xs"`) on the right. As the value of a `DetailField` (beside its label, or under it across the whole width with `stacked`), or alone in a section. |
| `DetailActions` | A row of buttons, wrapping, a line above it: under the header, or between sections. `sticky`: at the bottom of the panel, staying in sight as the detail scrolls (last child of the detail). |
| `DetailFieldButton` | A button floating at the right of a field on hover, in the look of the copy button of the tables, named in a bubble: the `tools` of a `DetailField`, before copy and edit. |
| `DetailTimeline` + `DetailTimelineItem` | Dated events along a line, the latest first: `icon`, `tone` (`default`, `green`, `red`, `amber`, `blue`), `title`, `date` (ISO, relative, exact on hover), details as children. |
| `DetailLoader` | Loads the row of `id` with `load(id)`, then draws `children(row)`: `DetailSkeleton` meanwhile (or `skeleton`), « Introuvable » when `load` answers null, « Réessayer » when it fails. Another id goes back to the skeleton; a new `refreshKey` loads again in the background, the detail shown meanwhile. |
| `DetailSkeleton` | While the detail loads: `fields` lines, `media` or not. |
| `DetailEmpty` | Nothing to show: the row is gone, or the call failed; `action` e.g. a retry button. |

## Rules

- **Loading.** The panel opens at once on the skeleton: pass `<RowPanel id={row.id} />` to `open`, a component that reads its `refreshKey` (a version bumped by every save) and wraps the detail in `DetailLoader`. The same `refreshKey` goes to the `DataTable`, so that a save in the detail shows in the list, and the reverse. The API answers new objects: rows are memoized on their object.

- **Images.** Large: `DetailCover` first in the detail. Small: the `imageColumn` of the table in `DetailColumnFields`, a thumbnail beside the name of the field, opened whole on click. Both may show the same image.

- **Same look as the list.** A value shown in the table goes through `DetailColumnFields`, never formatted again by hand: same status dot, pills, dates, copy on hover.
- **Full width.** Values let go of the widths of their table column; still cut at the panel's width, whole in a bubble on hover.
- **No panel chrome.** No close button, no title bar, no outer padding: the panel or the page brings them.
- **Text.** French, written by the page.
