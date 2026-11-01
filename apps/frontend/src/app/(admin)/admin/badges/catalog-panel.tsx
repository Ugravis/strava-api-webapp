"use client";

import type { AdminBadgeTheme } from "@kilotrace/shared/admin";
import { useCallback, useEffect, useMemo, useRef } from "react";
import { useSplitPanel } from "@/components/split-panel";
import { loadBadge, loadTheme } from "./actions";
import type { BadgeRights } from "./badge-bits";
import { THEME_ROW } from "./badge-columns";
import { BadgeRowPanel } from "./badge-detail";
import { ThemeRowPanel } from "./theme-detail";

/** Kept while its values are the same: the page hands a new object after each refresh. */
export function useStableRights(rights: BadgeRights): BadgeRights {
  return useMemo(() => rights, [rights.create, rights.edit, rights.delete]); // eslint-disable-line react-hooks/exhaustive-deps
}

/**
 * Opens a badge or a collection in the side panel, both tables sharing
 * `?row=`: a collection as `collection:<id>`. `activeBadge` and `activeTheme`
 * are the rows to highlight in each table.
 */
export function useCatalogPanel(themes: AdminBadgeTheme[], rights: BadgeRights) {
  const { open, isOpen, activeId } = useSplitPanel();
  const openBadge = useCallback(
    (badge: { id: string; name: string }) => open(<BadgeRowPanel id={badge.id} themes={themes} rights={rights} />, { id: badge.id, title: badge.name }),
    [open, themes, rights],
  );
  const openTheme = useCallback(
    (theme: { id: string; name: string }) =>
      open(<ThemeRowPanel id={theme.id} rights={rights} onOpenBadge={openBadge} />, { id: `${THEME_ROW}${theme.id}`, title: theme.name }),
    [open, rights, openBadge],
  );
  const active = isOpen ? activeId : null;
  return {
    openBadge,
    openTheme,
    activeBadge: active && !active.startsWith(THEME_ROW) ? active : null,
    activeTheme: active?.startsWith(THEME_ROW) ? active.slice(THEME_ROW.length) : null,
  };
}

/** A shared link: the badge or the collection of `?row=`, once on arrival, fetched by id. */
export function useSharedRow(openBadge: (badge: { id: string; name: string }) => void, openTheme: (theme: { id: string; name: string }) => void) {
  const arrived = useRef(false);
  useEffect(() => {
    if (arrived.current) return;
    arrived.current = true;
    const row = new URLSearchParams(window.location.search).get("row");
    if (!row) return;
    if (row.startsWith(THEME_ROW)) loadTheme(row.slice(THEME_ROW.length)).then((found) => found && openTheme(found.theme), () => {});
    else loadBadge(row).then((badge) => badge && openBadge(badge), () => {});
  }, [openBadge, openTheme]);
}
