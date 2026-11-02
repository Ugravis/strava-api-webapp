"use client";

import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, EyeIcon, EyeOffIcon, PanelRightOpenIcon } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { type DataTableConfig, DataTable, formatDateTime, RowActions } from "@/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { useUserPanel } from "../users/use-user-panel";
import { type AuditScope, fetchAuditTable, loadAuditEntry } from "./actions";
import { auditColumns, DOMAINS, OUTCOMES, useAuditVersion } from "./audit-columns";
import { AuditRowPanel, toggleHidden } from "./audit-detail";
import type { AuditRow } from "./audit-row";

const VISIBILITIES = { visible: "Non masquées", hidden: "Masquées" };

/** Keys of the grouping by author, as the backend sends them. */
const SYSTEM = "";
const DELETED = "~";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/**
 * The logs, append-only: `superAdmin` sees the masked entries and masks or
 * shows one again. A row opens the whole entry in the side panel, its users
 * too; `scope` keeps the entries of one author or one target.
 */
export function AuditTable({ scope, superAdmin }: { scope: AuditScope; superAdmin: boolean }) {
  const version = useAuditVersion();
  // Entries and users share `?row=`: both uuids, they never meet.
  const openUser = useUserPanel();
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<RowPanelControls | null>(null);

  const config = useMemo<DataTableConfig<AuditRow>>(
    () => ({
      id: "audit",
      fetch: (query: TableQuery) => fetchAuditTable(query, scope),
      rowId: (entry) => entry.id,
      muted: (entry) => !!entry.hiddenAt,
      search: "Raison, action ou utilisateur",
      noun: (count) => (count > 1 ? "entrées" : "entrée"),
      empty: { title: "Aucune entrée", description: "Les actions du back office apparaîtront ici." },
      views: [
        { id: "compact", label: "Table compacte", columns: ["createdAt", "actor", "target", "action", "outcome"] },
        { id: "detailed", label: "Table détaillée" },
      ],
      columns: auditColumns(openUser),
      facets: [
        { id: "domain", label: "Domaine", options: Object.entries(DOMAINS).map(([value, label]) => ({ value, label })) },
        { id: "outcome", label: "Résultat", options: Object.entries(OUTCOMES).map(([value, { label }]) => ({ value, label })) },
        ...(superAdmin
          ? [{ id: "visibility", label: "Visibilité", options: Object.entries(VISIBILITIES).map(([value, label]) => ({ value, label })) }]
          : []),
      ],
      groupings: [
        { id: "domain", label: "Domaine", title: (key) => DOMAINS[key] ?? key },
        { id: "actor", label: "Auteur", title: (key) => (key === SYSTEM ? "Système" : key === DELETED ? "Compte supprimé" : `@${key}`) },
      ],
      actions: (entry) => (
        <RowActions label={`Actions de l'entrée du ${formatDateTime(entry.createdAt)}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => panelRef.current?.open(entry.id)}>
              <PanelRightOpenIcon />
              Voir l&apos;entrée
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(entry.id, "ID copié")}>
              <CopyIcon />
              Copier l&apos;ID
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {/* The button of the detail. */}
          {superAdmin && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => toggleHidden(entry).then((result) => !result.ok && toast.error(result.message))}>
                {entry.hiddenAt ? <EyeIcon /> : <EyeOffIcon />}
                {entry.hiddenAt ? "Ne plus masquer" : "Masquer aux autres rôles"}
              </DropdownMenuItem>
            </>
          )}
        </RowActions>
      ),
    }),
    [scope, superAdmin, openUser],
  );
  const panel = useRowPanel<AuditRow>({
    config,
    title: (entry) => entry.label,
    load: loadAuditEntry,
    detail: (id) => <AuditRowPanel id={id} superAdmin={superAdmin} openUser={openUser} />,
  });
  useLayoutEffect(() => {
    panelRef.current = panel;
  });
  return <DataTable {...panel.table} refreshKey={version} />;
}
