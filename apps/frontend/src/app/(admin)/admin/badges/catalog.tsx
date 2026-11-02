"use client";

import type { AdminBadgeTheme } from "@kilotrace/shared/admin";
import { useCallback, useMemo, useRef } from "react";
import type { RowPanelControls } from "@/components/admin/detail";
import type { BadgeRights } from "./badge-bits";
import { BadgesTable } from "./badges-table";
import { ThemesTable } from "./themes-table";

/**
 * The collections, then the badges, both opened in the side panel: they
 * share `?row=`, a collection as `collection:<id>`, and a collection opens its badges.
 */
export function Catalog({ themes, rights: given }: { themes: AdminBadgeTheme[]; rights: BadgeRights }) {
  // A new object after each refresh of the page: kept while its values are the same.
  const rights = useMemo(() => given, [given.create, given.edit, given.delete]); // eslint-disable-line react-hooks/exhaustive-deps
  const badgesRef = useRef<RowPanelControls | null>(null);
  const openBadge = useCallback((id: string) => badgesRef.current?.open(id), []);
  return (
    <>
      <section className="flex flex-col gap-3">
        <div>
          <h2 className="font-medium">Collections</h2>
          <p className="text-sm text-muted-foreground">Regroupent des badges de tous les sports, en onglets sur la page Succès.</p>
        </div>
        <ThemesTable rights={rights} openBadge={openBadge} />
      </section>
      <section className="flex flex-col gap-3">
        <h2 className="font-medium">Badges</h2>
        <BadgesTable themes={themes} rights={rights} controlsRef={badgesRef} />
      </section>
    </>
  );
}
