import { useSyncExternalStore } from "react";

/** Whether the map shows the position of the user, kept by the browser: on by default. */
const STORAGE_KEY = "map-location";

let shown: boolean | null = null;
const listeners = new Set<() => void>();

function load(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== "off";
  } catch {
    return true;
  }
}

function locationShown(): boolean {
  if (typeof window === "undefined") return true;
  shown ??= load();
  return shown;
}

/** Shows or hides the position of the user and keeps the choice in the browser. */
export function setLocationShown(next: boolean): void {
  shown = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, next ? "on" : "off");
  } catch {
    // Not kept: the choice still applies until the page is closed.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useLocationShown(): boolean {
  return useSyncExternalStore(subscribe, locationShown, () => true);
}
