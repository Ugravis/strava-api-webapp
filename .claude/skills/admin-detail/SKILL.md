---
name: admin-detail
description: Build or change the detail of a back-office row with the detail kit (DetailHeader, DetailSection, DetailColumnFields, DetailField, DetailLoader…), in the split panel, a dialog or a page. Use whenever the user asks for the detail, card or sheet of a row ("fiche", "détail d'un utilisateur", "contenu du panneau"), or to add a field, a section, an in-place edit, a timeline or buttons to one; or to create a row ("nouveau", "création", "dupliquer") or edit fields of a section together.
---

# Admin detail

1. Read `docs/admin-detail.md`. It holds the blocks and the rules. Follow the rules as written.
2. Read `apps/admin/src/app/(shell)/development/admin-table/poc-detail.tsx` and `poc-badge-detail.tsx`: complete details using every block and every kind of in-place edit; `poc-badge-create.tsx`: a new row as a draft, fields bound to each other.
3. Shown in the side panel: read the skill `split-panel` too. The panel draws its own header; the detail brings no chrome (no close button, no title bar, no outer padding).
4. Build it:
   - the table wired by `useRowPanel` (`detail`, `load`, `create`, `afterRemove`), its `table` spread on the `DataTable`; the detail a `RowPanel` component wrapping it in `DetailLoader` with a `load(id)` Server Action and a `refreshKey` shared with the `DataTable`;
   - the rules of the row in `@kilotrace/shared/rules`, followed by the drafts (`rules`), the in-place edits (`fromRule`) and the API (`assertRules`); a field or a button not for every role `locked` with its reason;
   - a removal or a suspension through `DetailAction` `confirm` (a reason if needed), then `panel.removed(id)`; tabs (`DetailTabs`) only when the user asks for them (one scrolling column by default), related rows in `DetailRelated`, the audit log in `DetailHistory`; a field changed on a selection with `BulkEditAction` in `bulkActions`;
   - `DetailCover` (if any), then `DetailHeader`, then `DetailSection`s;
   - every value shown in the table through `DetailColumnFields` and the columns of its config, never formatted again by hand;
   - free fields with `DetailFields` + `DetailField`; in-place edits with `edit: { kind, value, onSave }` (text, number, date, select, multiselect, color, icon, image, switch: table in the doc), `onSave` a Server Action answering an `ActionResult`; a value of the table edited in place through `{ id, edit }` in `DetailColumnFields`;
   - a new row: `DetailForm` opened by the `create` of the table, `replace` once created; fields saved together: `DetailSectionForm`; both with `form.bind` (« Drafts » in the doc). Never a dialog of every field;
   - buttons as `DetailAction`s in `DetailActions`, `sticky` as the last child when the detail scrolls; an icon button of the header is a `DetailAction` too.
5. A kind of block that comes back across details deserves a new block in the kit (`packages/ui/src/components/admin/detail/`, one file per block, exported from `index.ts`), rather than markup repeated.
6. Check:
   - typecheck the frontend;
   - then the detail with agent-browser, signed in as the admin test account: the skeleton, a missing row, an edit saved and given up, the list updated after a save; for a draft, the errors, a server refusal, leaving it typed.
