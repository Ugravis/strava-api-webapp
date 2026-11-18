import { setWorkerUrl } from "maplibre-gl";

// MapLibre derives its worker URL from its own location at runtime, which the
// bundler cannot follow: the worker is declared here so that it is emitted.
// Imported for its effect by every map of the back office.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);
