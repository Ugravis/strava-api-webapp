"use client";

import { useState } from "react";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { USERS } from "./poc-columns";
import { type PocState, PocTable } from "./poc-table";

const STATES: Record<PocState, string> = { data: "Données", loading: "Chargement", empty: "Vide", error: "Erreur" };

/** The table, and above it the state to preview. */
export function PocView() {
  const [state, setState] = useState<PocState>("data");
  return (
    <>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        État
        <ToggleGroup variant="outline" size="sm" value={[state]} onValueChange={(next) => next[0] && setState(next[0] as PocState)} aria-label="État">
          {Object.entries(STATES).map(([key, text]) => (
            <ToggleGroupItem key={key} value={key}>
              {text}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      <PocTable config={USERS} state={state} />
    </>
  );
}
