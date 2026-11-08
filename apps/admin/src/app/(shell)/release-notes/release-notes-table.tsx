"use client";

import { RELEASE_NOTE_DISPLAYS } from "@kilotrace/shared";
import { type AdminReleaseNote, RELEASE_NOTE_STATES } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, EyeIcon, FileDownIcon, PanelRightOpenIcon, Trash2Icon } from "lucide-react";
import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { DataTable, type DataTableConfig, RowActions, useConfirmDialog } from "@kilotrace/ui/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@kilotrace/ui/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@kilotrace/ui/components/ui/dropdown-menu";
import { fetchReleaseNotesTable, loadReleaseNote } from "./actions";
import { deleteOf, DISPLAYS, stepOf, STEP_ICONS, RELEASES, releaseNoteColumns, type ReleaseNoteRights, STATES, useReleaseNotesVersion } from "./release-note-bits";
import { useReleaseNotePdf } from "@kilotrace/ui/components/release-notes/download-release-note-pdf";
import { pdfOf, publicOf, ReleaseNoteCreate, ReleaseNoteRowPanel } from "./release-note-detail";
import { ReleaseNotePreview } from "./release-note-preview";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

const COLUMNS = ["version", "title", "state", "display", "releasedAt", "concerned", "seen", "rate", "github"];

/** One row per release, even without a note, the latest first; a click opens it in the side panel. */
export function ReleaseNotesTable({ rights: given, currentVersion }: { rights: ReleaseNoteRights; currentVersion: string }) {
  // A new object after each refresh of the page: kept while its values are the same.
  const rights = useMemo(() => given, [given.create, given.edit, given.publish, given.delete]); // eslint-disable-line react-hooks/exhaustive-deps
  const version = useReleaseNotesVersion();
  const { ask, dialog } = useConfirmDialog();
  // Read by the menus of the rows, so that the config stays the same.
  const download = useReleaseNotePdf();
  const pdfRef = useRef((note: AdminReleaseNote) => pdfOf(note, download));
  // The note previewed from the menu of its row.
  const [previewed, setPreviewed] = useState<AdminReleaseNote | null>(null);
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<{ controls: RowPanelControls | null; active: string | null }>({ controls: null, active: null });

  const config = useMemo<DataTableConfig<AdminReleaseNote>>(
    () => ({
      id: "notes",
      fetch: (query: TableQuery) => fetchReleaseNotesTable(query),
      rowId: (note) => note.version,
      search: "Version, titre ou texte de la note",
      noun: (total) => (total > 1 ? "versions" : "version"),
      empty: { title: "Aucune version", description: "Chaque version apparaît ici dès le premier démarrage du site sur elle." },
      defaultSort: { id: "version", desc: true },
      maxHeight: "none",
      views: [
        { id: "table", label: "Tableau", columns: COLUMNS },
        { id: "cards", label: "Cartes", layout: "cards", columns: ["version", "title", "state", "display", "concerned", "rate"] },
      ],
      columns: releaseNoteColumns(rights.edit),
      muted: (note) => note.state === "empty",
      facets: [
        { id: "state", label: "Statut", options: RELEASE_NOTE_STATES.map((value) => ({ value, label: STATES[value].label })) },
        { id: "display", label: "Affichage", options: RELEASE_NOTE_DISPLAYS.map((value) => ({ value, label: DISPLAYS[value].label })) },
      ],
      groupings: [
        { id: "release", label: "Sortie", title: (key) => RELEASES[key as keyof typeof RELEASES]?.label ?? key },
        { id: "state", label: "Statut", title: (key) => STATES[key as keyof typeof STATES]?.label ?? key },
        { id: "display", label: "Affichage", title: (key) => DISPLAYS[key as keyof typeof DISPLAYS]?.label ?? key },
      ],
      actions: (note) => {
        const step = stepOf(note);
        const publishable = rights.publish && !step.lock;
        const deletable = rights.delete && !note.releasedAt;
        return (
          <RowActions label={`Actions de la v${note.version}`}>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => panelRef.current.controls?.open(note.version)}>
                <PanelRightOpenIcon />
                Ouvrir la fiche
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPreviewed(note)}>
                <EyeIcon />
                Aperçu
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => pdfRef.current(note)}>
                <FileDownIcon />
                Télécharger en PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => copy(note.version, "Version copiée")}>
                <CopyIcon />
                Copier la version
              </DropdownMenuItem>
            </DropdownMenuGroup>
            {(publishable || deletable) && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {publishable && (
                    <DropdownMenuItem variant={step.kind === "disable" ? "destructive" : "default"} onClick={() => ask(step.confirm, step.run)}>
                      {STEP_ICONS[step.kind]}
                      {step.label}
                    </DropdownMenuItem>
                  )}
                  {deletable && (
                    <DropdownMenuItem
                      variant="destructive"
                      onClick={() => {
                        const removal = deleteOf(note, () => {
                          const { controls, active } = panelRef.current;
                          if (active === note.version) controls?.removed(note.version);
                        });
                        ask(removal.confirm, removal.run);
                      }}
                    >
                      <Trash2Icon />
                      Supprimer
                    </DropdownMenuItem>
                  )}
                </DropdownMenuGroup>
              </>
            )}
          </RowActions>
        );
      },
    }),
    [rights, ask],
  );
  const panel = useRowPanel<AdminReleaseNote>({
    config,
    title: (note) => `v${note.version}`,
    load: loadReleaseNote,
    detail: (id, controls) => <ReleaseNoteRowPanel id={id} rights={rights} panel={controls} />,
    ...(rights.create && {
      create: {
        id: "new:release-note",
        label: "Nouveau",
        title: "Note à l'avance",
        copyTitle: "Copie de note",
        form: ({ initial, close, created }) => <ReleaseNoteCreate initial={initial} currentVersion={currentVersion} onCancel={close} onCreated={created} />,
      },
    }),
  });
  useLayoutEffect(() => {
    panelRef.current = { controls: panel, active: panel.table.activeRowId };
    pdfRef.current = (note) => pdfOf(note, download);
  });
  return (
    <>
      <DataTable {...panel.table} refreshKey={version} />
      {dialog}
      {previewed && <ReleaseNotePreview key={previewed.version} note={publicOf(previewed)} open onOpenChange={(open) => !open && setPreviewed(null)} />}
    </>
  );
}
