---
name: split-panel
description: Open content in the side panel of a section with the split panel kit (SplitPanelProvider, SplitPanelArea, useSplitPanel). Use whenever the user asks for a side panel, a detail on the right, a row opened on click ("split panel", "panneau latéral", "panneau de détail", "ouvrir une ligne à droite"), or to change its modes, width, history, folding, full screen or URL state.
---

# Split panel

1. Read `docs/split-panel.md`. It holds the behaviour, the API and the rules. Follow the rules as written.
2. Read `apps/frontend/src/app/(admin)/admin/development/admin-table/poc-view.tsx`: a table opening its rows in the panel.
3. Keep the kit generic: it knows nothing of tables nor of the admin, and the data table kit knows nothing of it. What a row shows is built by the page (back office: skill `admin-detail`).
4. A section without a panel yet: one `SplitPanelProvider` in its layout, under a `Suspense`; `SplitPanelArea` around the pages, the footer outside it.
5. In a page:
   - `open(content, { id, title })` on the click of a row, `<DataTable onRowClick={openRow} activeRowId={isOpen ? activeId : null} />`;
   - a shared link: open the row of `?row=` once on arrival, fetched by id when not on the page;
   - several tables opening the panel: ids that never meet.
6. Check:
   - typecheck the frontend;
   - then the page with agent-browser, signed in as the admin test account: both modes, resize, fold, full screen, back and forward, `Esc`, the phone width, and the URL after a reload.
