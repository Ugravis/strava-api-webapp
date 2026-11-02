"use client";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { type PocSettings, setPocSettings, usePocSettings } from "./poc-store";

const ROLES: Record<PocSettings["role"], string> = { "super-admin": "Super-admin", moderator: "Modérateur" };
const AFTER: Record<PocSettings["afterRemove"], string> = { close: "Fermer le panneau", next: "Ligne suivante" };

/** What the showcase simulates for both tables: the role of the user (its locks), what follows a removal. */
export function PocSettingsBar() {
  const settings = usePocSettings();
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-muted-foreground">
      <span className="flex items-center gap-2">
        Rôle
        <ToggleGroup variant="outline" size="sm" value={[settings.role]} onValueChange={(next) => next[0] && setPocSettings({ role: next[0] as PocSettings["role"] })} aria-label="Rôle simulé">
          {Object.entries(ROLES).map(([key, text]) => (
            <ToggleGroupItem key={key} value={key}>
              {text}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </span>
      <span className="flex items-center gap-2">
        Après une suppression
        <ToggleGroup variant="outline" size="sm" value={[settings.afterRemove]} onValueChange={(next) => next[0] && setPocSettings({ afterRemove: next[0] as PocSettings["afterRemove"] })} aria-label="Après une suppression">
          {Object.entries(AFTER).map(([key, text]) => (
            <ToggleGroupItem key={key} value={key}>
              {text}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </span>
    </div>
  );
}
