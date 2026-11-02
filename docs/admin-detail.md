# Admin detail content

The content of a detail of the back office: what the split panel (`docs/split-panel.md`) shows of a row, and the same blocks in a dialog or a page. The panel draws its own header (back, forward, title, fold, mode, close); these blocks are what goes inside. Showcase: `/admin/development/admin-table`, a click on a row of either table (`poc-detail.tsx`, `poc-badge-detail.tsx`); « Nouveau badge » or « Dupliquer » for a draft (`poc-badge-create.tsx`), the pencil of « Période » for a section edited as a whole.

## Where things are

| Path | Role |
| --- | --- |
| `apps/frontend/src/components/admin/detail/` (import from `@/components/admin/detail`) | The blocks below. Client side. |
| `apps/frontend/src/components/admin/data-table/` | The cells drawing the values: the detail depends on the table kit, never the other way. |

## Blocks

| Block | Use |
| --- | --- |
| `DetailCover` | A large image across the top, above the header, opened whole on click; without one, a hatched band « Aucune image », so that every row of a detail with a cover has one. In a draft too, `image` the value of its field (a URL, or the file picked, shown at once). |
| `DetailHeader` | `media` (avatar, icon), `title`, `subtitle`, `marks` beside the title, `actions` on the right (icon buttons). |
| `DetailMedia` | The `media` of a header told by an icon: a large disc in the look of the first column of its table, `background` filling it or `color` tinting the icon. |
| `DetailSection` | A part under a small uppercase `title`, `pill` right after it (`{ icon, label, tone }`, the tones of the table pills, e.g. « Modération » in amber), `aside` on its right; a line between sections. `tone`: `danger` (e.g. a suspension). |
| `DetailColumnFields` | The fields of a row as its table draws them: `row`, the `columns` of its `DataTableConfig`, the `ids` to show in order. Name, icon, cell and copy button of each column. |
| `DetailColumnField` | One of them, `id`: in a `DetailFields` among free fields, so that a section keeps a single list. `edit` edits it in place as a `DetailField` (`{ id, edit }` in `DetailColumnFields`; the `edit` of its column by default, so a value edited in the table is edited in the detail too), the value still drawn by its column, e.g. a collection picked in a list, categories in a list of several. Drawn whole: every item of a list (pills, icons) shown and wrapping, none counted as « +n ». |
| `DetailFields` + `DetailField` | Free fields: `label`, `icon`, the value as children, « — » when empty. On hover, buttons float at the right of the value: `tools` (any `DetailFieldButton`), copy (a text or a number shown is copied as is; `copy` gives the text of any other value, `null` none), edit (`edit`). `edit` edits in place, after its `kind` (below): the pencil only, never a click on the value, opens a field or a popover; Enter (⌘ Enter on several lines), ✓, leaving the field or closing the popover saves (a colour or an image by « Valider » only), Esc or ✕ gives up (the panel stays open); `onSave(value) => Promise<ActionResult \| void>`, `{ ok: false }` keeping the field open, its message in a bubble centred above the field, in the red of the error toasts (no toast, nothing moves). Without children the value is drawn after its kind. Nothing is ever left unsaved, so nothing guards the closing of the panel (a draft does, below). While a popover is open its pencil stays shown, pressed, and closes it again, giving up. On a screen without hover (a phone), no button floats: a tap on the value opens a bubble of its actions, each with its icon and its name (« Ouvrir le lien » for a value with an `href`, its link no longer followed at once; « Ouvrir » the row in a table; the tools; « Copier »; « Modifier »). Bubbles are modal there: any tap outside their buttons only closes them, reaching nothing beneath. A text, a number or a date is then typed in a bubble under its value, centred on the screen, in a table as in a detail; a tap outside saves. Popovers of edits open centred under the value. Buttons that save an edit (✓, « Valider ») are blue (`SAVE_BUTTON`). A modifiable field shows a small blue dot at the top right of its icon (after its label without one): one with an `edit`, or holding a button that changes it (`DetailItemButton`, e.g. unlink or remove; a tool with `modifies`). `editHint` forces it (`true`) or hides it (`false`), named « Champ modifiable » in a bubble (`{ id, editHint }` in `DetailColumnFields`). `stacked`: the value under its label, across the whole width, wrapping (a long text), its buttons at the top right of the panel; in `DetailColumnFields`, `{ id, stacked: true }`. |
| `DetailItems` + `DetailItem` | Several values of one field, one per line: `icon` in a grey square on the left, as in the icon cells of the tables, the text, `actions` (`DetailItemButton`s, always in sight) on the right. As the value of a `DetailField` (beside its label, or under it across the whole width with `stacked`), or alone in a section. |
| `DetailItemButton` | An icon button of the `actions` of a `DetailItem`, in the look of the floating buttons of the fields (border, background), named in a bubble. |
| `DetailActions` + `DetailAction` | A row of buttons on a single line, a line above it: under the header, or between sections. The buttons share the whole width; when their names no longer fit, they show their icon only, named in a bubble after 400 ms. `sticky`: at the bottom of the panel, staying in sight as the detail scrolls (last child of the detail). `DetailAction`: `label`, `icon`, `variant` (`outline`, `default`, `destructive`, `save`: the blue of the buttons that save), `onClick` or `href` (a new tab), `type="submit"` (submits the draft around), `disabled`, `pending` (a spinner for its icon, disabled); outside `DetailActions` (e.g. the `actions` of `DetailHeader`), its icon alone with its bubble. |
| `DetailForm` | A new row, as a draft (below): `initial` (blank, or a row copied), `children(form)` the detail of the row, `onSubmit(values)`, `onCancel`, `onCreated(result)`, `submitLabel`. « Annuler » and « Créer » kept at the bottom of the panel. |
| `DetailSectionForm` | A `DetailSection` whose fields are edited together, as a draft (below): `title`, `pill`, `tone`, `initial`, `children(form)`, `onSubmit(values)`, `editLabel` (its pencil, « Modifier : <title> » by default). |
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
| `image` | The URL shown, `string \| null`; `onSave` given a `File`, or `null` once removed | A popover: the image, replaced by a file picked or dropped, refused beyond `maxSize` in the bubble, formats and weight told in its title; saved by « Valider » only, « Annuler » or closing it gives up; widened from its bottom left corner (320 to 480 px). The Server Action uploads it and answers the row with its new URL | `accept` (PNG, JPEG, WebP by default), `maxSize` (bytes), `noneLabel` (removes it) |
| `switch` | `boolean` | The switch itself, saved as soon as switched; no pencil | |

Options: `{ value, label, icon?, tone? }`, a `tone` drawing it as a pill of the tables. A value cleared that the API refuses answers `{ ok: false }`, the field staying open.

Every kind takes `required` (a value cleared refused before the call, « Champ obligatoire. ») and `validate?: (value) => string | null`: the value refused before `onSave`, its reason in the bubble, e.g. a field hanging on another one of the row (`validate: (end) => end < row.start ? "…" : null`). A value typed wrong shows there too, telling what is expected: « Le nombre doit être entre 1 et 100 km. », « Image trop lourde (3,4 Mo) : 2 Mo maximum. ». The server stays the judge: `validate` only answers sooner.

## Drafts: creating a row, editing fields together

Editing is in place, one field at a time (above). No dialog holding every field of a row. Two cases only type several fields before saving them as a whole, both through a draft:

- **A new row**: `DetailForm`, opened in the panel by the `create` button of the table (`docs/admin-tables.md`), or by « Dupliquer » filled from a row. Nothing is created before « Créer »: a row half typed never exists.
- **Fields bound to each other** in a row (a start and its end, a choice and what hangs on it), that the server refuses apart: `DetailSectionForm`, one pencil on the right of the section title opening them all, one « Valider ». Any other field stays in place.

The fields are those of the detail: `DetailField` and `DetailColumnField`, their `edit` given by `form.bind(name, spec)`, `spec` the options of a kind (table above) without `value` nor `onSave`:

```tsx
<DetailForm initial={BLANK} onSubmit={createBadge} onCancel={close} onCreated={({ id }) => replace(<BadgePanel id={id!} />, { id })}>
  {(form) => (
    <>
      <DetailHeader title={form.values.name || "Nouveau badge"} />
      <DetailSection title="Badge">
        <DetailFields>
          <DetailField label="Nom" icon={<TypeIcon />} edit={form.bind("name", { kind: "text", required: true })} />
        </DetailFields>
        {/* No row yet: `row` left out, the name and icon of the column kept. */}
        <DetailColumnFields columns={BADGES.columns} ids={[{ id: "collection", edit: form.bind("collection", { kind: "select", options, required: true }) }]} />
      </DetailSection>
    </>
  )}
</DetailForm>
```

| Key of `form` | Use |
| --- | --- |
| `values` | The draft as typed: the header, a unit, a bound or a field shown follow it. |
| `bind(name, spec)` | The `edit` of a field. `spec`: `kind`, its options, `required` (may hang on other values), `validate(value, values)` (a field bound to another), `onChange(value)` (after a change of the user, e.g. a default of another field). |
| `set(name, value)` | A value set by the page, e.g. the icon following the collection. |
| `touched(name)` | Changed by the user: a default set by `set` stops once it is. |
| `dirty`, `saving` | |

- **Fields.** Always open, no pencil, no blue dot; a red star after the label of a required one. A text, a number or a date is a field (16 px on a phone, so that the browser does not zoom); a list, a colour, an icon or an image a box opening the popover of its kind, a pick going to the draft (`Valider` of a colour or an image still needed); a switch switches. Enter submits (⌘ Enter on several lines). The first field focused, except on a phone (the keyboard would open).
- **Errors.** Under their field, in red: on leaving a field changed, then all of them on submitting, the first one scrolled to and focused, their count above the buttons (« 2 champs à corriger. »). A number or a date half typed tells what is expected. A field hidden (`{values.collection === "distance" && …}`) is judged by nothing. The server stays the judge: `onSubmit` answers a `DetailDraftResult`, `{ ok: false, field: "name", message }` under that field, without `field` above the buttons, a call that throws « L'enregistrement a échoué. Réessayer. ».
- **Created.** `onSubmit` answers `{ ok: true, id, message }`: the message in a toast, then `onCreated`: the panel shows the row with `replace` (no step of back and forward toward a draft gone), the table, given a new `refreshKey`, lists it. The `?row=` of a draft (e.g. `new:badge`) opens a blank one from a link.
- **Image.** The draft holds the `File` picked (shown at once, in its field, its popover opened again, and the cover), uploaded by `onSubmit` with the rest. A detail with a cover keeps it in its draft: `<DetailCover image={form.values.picture} />`.
- **Section.** At rest, its fields show their values, copied as usual, a switch told « Oui » / « Non ». Editing: the section greyed, « Annuler » or Esc gives up (the panel stays open), « Valider » or Enter saves. Unchanged, « Valider » just closes. A new `initial` (the row loaded again) replaces the values at rest, never those being typed.
- **Leaving.** A draft typed and not saved: closing the panel, opening another row (a click, ↑ / ↓), back or forward, a link of the page ask first, « Abandonner la saisie ? »; closing or reloading the tab, the browser asks (`useSplitPanelGuard`, `docs/split-panel.md`). Saved or unchanged, nothing asks.

## Rules

- **Loading.** The panel opens at once on the skeleton: pass `<RowPanel id={row.id} />` to `open`, a component that reads its `refreshKey` (a version bumped by every save) and wraps the detail in `DetailLoader`. The same `refreshKey` goes to the `DataTable`, so that a save in the detail shows in the list, and the reverse. The API answers new objects: rows are memoized on their object.

- **Images.** Large: `DetailCover` first in the detail. Small: the `imageColumn` of the table in `DetailColumnFields`, a thumbnail beside the name of the field, opened whole on click. Both may show the same image.

- **Same look as the list.** A value shown in the table goes through `DetailColumnFields` / `DetailColumnField`, never formatted again by hand: same status dot, pills, dates, copy on hover.
- **Everything.** Every field the API answers for the row is shown, and every value can be copied.
- **Buttons.** Always `DetailAction`: an icon alone always has its bubble.
- **Full width.** Values let go of the widths of their table column; still cut at the panel's width, whole in a bubble on hover.
- **No panel chrome.** No close button, no title bar, no outer padding: the panel or the page brings them.
- **Text.** French, written by the page.
