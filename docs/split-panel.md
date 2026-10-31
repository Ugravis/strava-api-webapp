# Split panel

A detail panel on the right of the pages of a section, e.g. the row of a table opened by a click. Generic: it knows nothing of tables, and the data table kit knows nothing of it (`docs/admin-tables.md`). Showcase: `/admin/development/admin-table`, the first table.

## Where things are

| Path | Role |
| --- | --- |
| `apps/frontend/src/components/split-panel/` (import from `@/components/split-panel`) | `SplitPanelProvider` (state), `SplitPanelArea` (the pages and the panel), `useSplitPanel` (for pages). |
| `apps/frontend/src/app/(admin)/layout.tsx` | The provider of the back office around the pages and the footer, the area around the pages only. |

## Behaviour

- **Two modes, one look.** A card with rounded corners, inset from the edges. `overlay` (default): floating over the page, which keeps its layout. `split`: beside the page, which shrinks to make room, on a light grey ground without corners whose left margin is the gutter, without shadow. The card keeps the same width in both modes; switching animates the room made by the page, the grey ground and the shadow. A button in the header switches; the choice is kept in `?panel=` and in `localStorage` (`split-panel.mode`), the URL winning.
- **Height.** Sticks to the top of the screen and stops where the footer starts: the area holds the pages, not the footer.
- **Width.** Dragged by the margin left of the card (the grey gutter in split mode), its grip shown on hover, by the distance moved: a mere click changes nothing; nothing animates while it is dragged. Between 320 px and 70 % of the window, kept in `localStorage` (`split-panel.width`); a double click goes back to 400 px, the default.
- **Back and forward.** Arrows in the header, as in a browser, through the contents opened since the panel opened (50 at most). Opening another one drops those ahead. `?row=` follows.
- **Folding.** A button in the header slides the panel out without closing it; a handle stays on the right edge to bring it back. In split mode the page takes the whole width meanwhile. Opening another content unfolds it.
- **Full screen.** A button in the header lays the panel over the whole page, as a page of its own (`?panel=full`), without gutter or card, its content in a centred column; the arrows of the table still move from row to row. The same button, or `Esc`, comes back to the mode it left. Neither fold nor mode nor resize meanwhile; never on a phone.
- **Phone** (under 768 px): over the whole width of the page, under the header of the site and above the footer, never split, not resizable.
- **Closing.** The X, `Esc` (unless a menu or a dialog handled it first; out of full screen first), or a change of page.
- **URL.** `open(content, { id })` writes `?row=<id>&panel=<mode>` through the history (no server round trip); `close()` removes both. A link with `?row=` is shared: the page opens that row on arrival, in the mode of `?panel=`.
- **Header.** Icon buttons, each named in a bubble after 400 ms.
- **Content.** Pages hand only the content, scrolled with the thin scrollbar of the tables; the panel draws the header (back, forward, title, fold, full screen, mode, close) and scrolls its body, a column at least as tall as the panel (so that a sticky row of buttons sits at the bottom).

## API

```tsx
const { open, close, isOpen, activeId } = useSplitPanel();
open(<Detail row={row} />, { id: row.id, title: "@username" });
```

| Key | Use |
| --- | --- |
| `open(content, options?)` | Shows `content`, replacing what the panel showed. `options.id` goes in `?row=`; `options.title` in the header (« Détail » otherwise). |
| `close()` | Closes, removes `?row=`. |
| `isOpen` | Whether it shows something. |
| `activeId` | The `?row=` of the URL. |

## With a data table

```tsx
const { open, isOpen, activeId } = useSplitPanel();
const openRow = useCallback((user: User) => open(<UserDetail user={user} />, { id: user.id, title: `@${user.username}` }), [open]);

// A shared link: the row of `?row=`, once on arrival (fetched by id when not on the page).
useEffect(() => {
  const id = new URLSearchParams(window.location.search).get("row");
  if (id) loadUser(id).then((user) => user && openRow(user));
}, [openRow]);

return <DataTable config={USERS} onRowClick={openRow} activeRowId={isOpen ? activeId : null} />;
```

The table then highlights the row opened and moves it with ↑ / ↓, which opens the next row in the panel.

## Rules

- One provider per section, in its layout, under a `Suspense` (it reads the search params); `SplitPanelArea` around the pages, the footer outside it.
- Several tables of a page may open the panel: they share `?row=`, so their ids must never meet (e.g. uuids and slugs). Back and forward then go from one table to the other.
- The content is built by the page; nothing about the panel goes in it. In the back office, with the detail kit (`docs/admin-detail.md`).
