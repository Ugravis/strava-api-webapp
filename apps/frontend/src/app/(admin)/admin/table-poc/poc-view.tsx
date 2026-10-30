"use client";

import { useMemo, useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { USERS } from "./poc-columns";
import { serve } from "./poc-server";
import { PocTable } from "./poc-table";

type PocState = "data" | "loading" | "empty" | "error";
const STATES: Record<PocState, string> = { data: "Données", loading: "Chargement", empty: "Vide", error: "Erreur" };

/** The table, and above it how the fake server answers. */
export function PocView() {
  const [state, setState] = useState<PocState>("data");
  const config = useMemo(
    () => ({
      ...USERS,
      fetch: {
        data: USERS.fetch,
        loading: () => new Promise<never>(() => {}),
        empty: (request: Parameters<typeof USERS.fetch>[0]) => serve([], USERS, request),
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
      <PocTable config={config} />
    </>
  );
}
