---
name: admin-detail
description: Build or change the detail of a back-office row with the detail kit (DetailHeader, DetailSection, DetailColumnFields, DetailField, DetailLoader…), in the split panel, a dialog or a page. Use whenever the user asks for the detail, card or sheet of a row ("fiche", "détail d'un utilisateur", "contenu du panneau"), or to add a field, a section, an in-place edit, a timeline or buttons to one.
---

# Admin detail

1. Read `docs/admin-detail.md`. It holds the blocks and the rules. Follow the rules as written.
2. Read `apps/frontend/src/app/(admin)/admin/development/admin-table/poc-detail.tsx` and `poc-badge-detail.tsx`: complete details using every block.
3. Shown in the side panel: read the skill `split-panel` too. The panel draws its own header; the detail brings no chrome (no close button, no title bar, no outer padding).
4. Build it:
   - a `RowPanel` component handed to `open`, wrapping the detail in `DetailLoader` with a `load(id)` Server Action and a `refreshKey` shared with the `DataTable`;
   - `DetailCover` (if any), then `DetailHeader`, then `DetailSection`s;
   - every value shown in the table through `DetailColumnFields` and the columns of its config, never formatted again by hand;
   - free fields with `DetailFields` + `DetailField`; in-place edits with `edit: { value, onSave }`, `onSave` a Server Action answering an `ActionResult`;
   - buttons as `DetailAction`s in `DetailActions`, `sticky` as the last child when the detail scrolls; an icon button of the header is a `DetailAction` too.
5. A kind of block that comes back across details deserves a new block in the kit (`apps/frontend/src/components/admin/detail/`, one file per block, exported from `index.ts`), rather than markup repeated.
6. Check:
   - typecheck the frontend;
   - then the detail with agent-browser, signed in as the admin test account: the skeleton, a missing row, an edit saved and given up, the list updated after a save.
