import { useSyncExternalStore } from "react";

/**
 * A version of the rows of a page, bumped by every change made from the
 * back office: the `refreshKey` of its tables and of its details, which
 * fetch again in the background.
 */
export function createVersion() {
  let version = 0;
  const listeners = new Set<() => void>();
  const subscribe = (onChange: () => void) => {
    listeners.add(onChange);
    return () => listeners.delete(onChange);
  };
  return {
    useVersion: () => useSyncExternalStore(subscribe, () => version, () => 0),
    bump: () => {
      version += 1;
      listeners.forEach((listener) => listener());
    },
  };
}
