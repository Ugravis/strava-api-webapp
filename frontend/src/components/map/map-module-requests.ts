import { useEffect } from "react";
import type { MapModule } from "./map-layers";

/** Event asking the map open on the page to select a module, sent from outside it, such as the navigation. */
const MODULE_REQUEST_EVENT = "map:module-request";

/** Asks the map open on the page to select `module`, which is then shown on it. */
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
