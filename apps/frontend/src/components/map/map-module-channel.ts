import { useEffect, useSyncExternalStore } from "react";
import type { MapModule } from "./map-layers";

/**
 * Channel between the map open on the page and the rest of the app, such as
 * the navigation: the map publishes the module selected in its band, and
 * the others may ask it to select another one.
 */

/** Event asking the map open on the page to select a module. */
const MODULE_REQUEST_EVENT = "map:module-request";

/** Module selected on the map open on the page; null without a map. */
let openModule: MapModule | null = null;
const listeners = new Set<() => void>();

/** Publishes the module selected on the map, or null once the map is gone. */
export function publishMapModule(module: MapModule | null): void {
  if (module === openModule) return;
  openModule = module;
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** The module selected on the map open on the page; null without a map, as on the server. */
export function useOpenMapModule(): MapModule | null {
  return useSyncExternalStore(
    subscribe,
    () => openModule,
    () => null,
  );
}

/** Asks the map open on the page to open `module`, as the navigation does: selected and shown, see `withModuleOpened`. */
export function requestMapModule(module: MapModule): void {
  window.dispatchEvent(new CustomEvent<MapModule>(MODULE_REQUEST_EVENT, { detail: module }));
}

/** Calls `onRequest` with each module asked for by `requestMapModule`; `onRequest` should be stable. */
export function useMapModuleRequests(onRequest: (module: MapModule) => void): void {
  useEffect(() => {
    const listener = (event: Event) => onRequest((event as CustomEvent<MapModule>).detail);
    window.addEventListener(MODULE_REQUEST_EVENT, listener);
    return () => window.removeEventListener(MODULE_REQUEST_EVENT, listener);
  }, [onRequest]);
}
