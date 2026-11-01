"use client";

import type { AdminBadge, AdminBadgeTheme } from "@kilotrace/shared/admin";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { useSplitPanel } from "@/components/split-panel";
import { setBadgeActive, setBadgesActive } from "./actions";
import { BadgeFormDialog, type BadgeRights, DeleteBadgeDialog, DeleteThemeDialog, ThemeFormDialog } from "./badge-bits";
import { bumpCatalog, THEME_ROW } from "./badge-columns";

/** Turns badges on or off, told by a toast; true once done. */
export async function toggleBadges(ids: string[], active: boolean): Promise<boolean> {
  const result = ids.length === 1 ? await setBadgeActive(ids[0], active) : await setBadgesActive(ids, active);
  if (!result.ok) {
    toast.error(result.message);
    return false;
  }
  toast.success(active ? "Activé" : "Désactivé");
  bumpCatalog();
  return true;
}

/**
 * The creation, the edit and the deletion of a badge, opened by the table or
 * a button of its detail; `dialogs` goes anywhere in the page. Once done, the
 * catalog fetches again; a deleted badge open in the panel closes it.
 */
export function useBadgeDialogs(themes: AdminBadgeTheme[], rights: BadgeRights) {
  const { close, activeId } = useSplitPanel();
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [editing, setEditing] = useState<{ open: boolean; badge: AdminBadge | null }>({ open: false, badge: null });
  const [deleting, setDeleting] = useState<{ open: boolean; badge: AdminBadge | null }>({ open: false, badge: null });
  /** `null` creates one. */
  const openEdit = useCallback((badge: AdminBadge | null) => setEditing({ open: true, badge }), []);
  const openDelete = useCallback((badge: AdminBadge) => setDeleting({ open: true, badge }), []);
  const dialogs = (
    <>
      {(rights.create || rights.edit) && (
        <BadgeFormDialog open={editing.open} onOpenChange={(open) => setEditing({ ...editing, open })} onSuccess={bumpCatalog} badge={editing.badge} themes={themes} />
      )}
      {rights.delete && (
        <DeleteBadgeDialog
          open={deleting.open}
          onOpenChange={(open) => setDeleting({ ...deleting, open })}
          onSuccess={() => {
            if (activeId === deleting.badge?.id) close();
            bumpCatalog();
          }}
          badge={deleting.badge}
        />
      )}
    </>
  );
  return { openEdit, openDelete, dialogs };
}

/** The same for a collection. */
export function useThemeDialogs(rights: BadgeRights) {
  const { close, activeId } = useSplitPanel();
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [editing, setEditing] = useState<{ open: boolean; theme: AdminBadgeTheme | null }>({ open: false, theme: null });
  const [deleting, setDeleting] = useState<{ open: boolean; theme: AdminBadgeTheme | null }>({ open: false, theme: null });
  /** `null` creates one. */
  const openEdit = useCallback((theme: AdminBadgeTheme | null) => setEditing({ open: true, theme }), []);
  const openDelete = useCallback((theme: AdminBadgeTheme) => setDeleting({ open: true, theme }), []);
  const dialogs = (
    <>
      {(rights.create || rights.edit) && (
        <ThemeFormDialog open={editing.open} onOpenChange={(open) => setEditing({ ...editing, open })} onSuccess={bumpCatalog} theme={editing.theme} />
      )}
      {rights.delete && (
        <DeleteThemeDialog
          open={deleting.open}
          onOpenChange={(open) => setDeleting({ ...deleting, open })}
          onSuccess={() => {
            if (activeId === `${THEME_ROW}${deleting.theme?.id}`) close();
            bumpCatalog();
          }}
          theme={deleting.theme}
        />
      )}
    </>
  );
  return { openEdit, openDelete, dialogs };
}
