"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DataTable, type TablePage } from "@/components/admin/data-table";
import { useSplitPanel } from "@/components/split-panel";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { fetchPocUsers, USERS } from "./poc-columns";
import { POC_USERS, type PocUser } from "./poc-data";
import { PocUserPanel } from "./poc-detail";
import { usePocVersion } from "./poc-store";

type PocState = "data" | "loading" | "empty" | "error";
const STATES: Record<PocState, string> = { data: "Données", loading: "Chargement", empty: "Vide", error: "Erreur" };

const EMPTY: TablePage<PocUser> = { entries: [], total: 0, visible: 0, page: 1, pages: 1, before: 0, counts: {} };

/** The table, and above it how the fake server answers. A click on a row opens its detail. */
export function PocView() {
  const [state, setState] = useState<PocState>("data");
  const { open, isOpen, activeId } = useSplitPanel();
  const version = usePocVersion();
  const openUser = useCallback(
    // Opened at once on its skeleton, the account loaded by the panel.
    (user: PocUser) => open(<PocUserPanel id={user.id} />, { id: user.id, title: `@${user.username}` }),
    [open],
  );
  // A shared link: the row of `?row=`, once on arrival.
  useEffect(() => {
    const user = POC_USERS.find((each) => each.id === new URLSearchParams(window.location.search).get("row"));
    if (user) openUser(user);
  }, [openUser]);
  const config = useMemo(
    () => ({
      ...USERS,
      fetch: {
        data: fetchPocUsers,
        loading: () => new Promise<never>(() => {}),
        empty: () => new Promise<TablePage<PocUser>>((resolve) => setTimeout(() => resolve(EMPTY), 400)),
        error: () => new Promise<never>((_, reject) => setTimeout(() => reject(new Error("503")), 400)),
      }[state],
    }),
    [state],
  );
  return (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        Serveur
        <ToggleGroup variant="outline" size="sm" value={[state]} onValueChange={(next) => next[0] && setState(next[0] as PocState)} aria-label="Réponse du serveur">
          {Object.entries(STATES).map(([key, text]) => (
            <ToggleGroupItem key={key} value={key}>
              {text}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <DataTable config={config} onRowClick={openUser} activeRowId={isOpen ? activeId : null} refreshKey={version} />
    </>
  );
}
