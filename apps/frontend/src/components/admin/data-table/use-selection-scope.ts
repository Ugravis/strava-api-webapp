import { useEffect, useEffectEvent, useId } from "react";
import type { DataTableState } from "./use-data-table";

/** The tables of the page: one selection at a time, a table picking rows clears the others. */
const selecting = new Set<(owner: string) => void>();

/** One selection on the page: told as it starts, the others cleared. Esc clears it first, before a panel closes. */
export function useSelectionScope<T>(state: DataTableState<T>) {
  const { selected } = state;
  const instance = useId();
  const clearOthers = useEffectEvent((owner: string) => owner !== instance && selected.size > 0 && state.clearSelection());
  useEffect(() => {
    const listener = (owner: string) => clearOthers(owner);
    selecting.add(listener);
    return () => void selecting.delete(listener);
  }, []);
  const picking = selected.size > 0;
  useEffect(() => {
    if (picking) selecting.forEach((listener) => listener(instance));
  }, [picking, instance]);

  // Esc clears the selection first, before a panel closes: left to a field, a menu, a dialog or the panel itself.
  const clearSelection = state.clearSelection;
  useEffect(() => {
    if (selected.size === 0) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented) return;
      const target = event.target;
      if (target instanceof Element && target.closest("input, textarea, select, [contenteditable=true], [role=menu], [role=listbox], [role=dialog], [role=alertdialog], aside")) return;
      if (document.querySelector("[role=dialog], [role=alertdialog], [role=menu]")) return;
      event.preventDefault();
      clearSelection();
    };
    // Captured, ahead of the panel, which listens on the document too.
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [selected, clearSelection]);
}
