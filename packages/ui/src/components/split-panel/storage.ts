import { useSyncExternalStore } from "react";

/** A choice kept in `localStorage`, read again by every panel when it changes. */
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
export function store(key: string, value: string | null) {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  listeners.forEach((listener) => listener());
}
/** The server knows neither: the defaults until the browser reads them. */
export function useStored(key: string) {
  return useSyncExternalStore(subscribe, () => localStorage.getItem(key), () => null);
}

/** Written through the history, which Next follows without a server round trip. Null removes the key. */
export function writeParams(changes: Record<string, string | null>) {
  const next = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  const search = next.toString();
  window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}
