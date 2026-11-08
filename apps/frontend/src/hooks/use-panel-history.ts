"use client";

import { useCallback, useState } from "react";

interface History<T> {
  entries: T[];
  /** Index of the current entry; -1 when empty. */
  index: number;
}

const EMPTY: History<never> = { entries: [], index: -1 };

/**
 * A browsing history, like a browser's: a new entry drops those ahead of the
 * current one, back and forward move between them.
 */
export function usePanelHistory<T>(same: (a: T, b: T) => boolean, initial: T | null = null) {
  const [{ entries, index }, setHistory] = useState<History<T>>(() =>
    initial === null ? EMPTY : { entries: [initial], index: 0 },
  );

  const push = useCallback(
    (entry: T) =>
      setHistory((history) => {
        const current = history.entries[history.index];
        // The current entry again: nothing to go back to.
        if (current !== undefined && same(current, entry)) return history;
        return { entries: [...history.entries.slice(0, history.index + 1), entry], index: history.index + 1 };
      }),
    [same],
  );
  /** Replaces the current entry, e.g. by another view of it, without adding to the history. */
  const replace = useCallback(
    (entry: T) =>
      setHistory((history) =>
        history.index < 0
          ? history
          : { ...history, entries: history.entries.map((current, i) => (i === history.index ? entry : current)) },
      ),
    [],
  );
  const back = useCallback(
    () => setHistory((history) => (history.index > 0 ? { ...history, index: history.index - 1 } : history)),
    [],
  );
  const forward = useCallback(
    () =>
      setHistory((history) =>
        history.index < history.entries.length - 1 ? { ...history, index: history.index + 1 } : history,
      ),
    [],
  );
  const clear = useCallback(() => setHistory(EMPTY), []);

  return {
    current: entries[index] ?? null,
    canGoBack: index > 0,
    canGoForward: index < entries.length - 1,
    push,
    replace,
    back,
    forward,
    clear,
  };
}
