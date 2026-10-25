import type { HistoryMode } from "@/lib/api/types";
import {
  dayAtStep,
  dayOf,
  DEFAULT_STEP_INDEX,
  HISTORY_STEPS,
  type HistoryDay,
  type HistorySettings,
  type HistoryStep,
} from "@/lib/tiles/history-period";
import {
  DEFAULT_MAP_LAYERS,
  DEFAULT_MAP_MODULE,
  MAP_MODULES,
  type MapLayers,
  type MapModule,
  withModuleOpened,
} from "./map-layers";
import { searchOf } from "./panel-entry";

/** The tool open on the map, with what it shows. */
export type AddressedTool = { kind: "history"; settings: HistorySettings } | { kind: "sector"; code: string };

/** What the address of the map keeps besides the entry of the panel: the layers, the module selected in the band and the tool open. */
export interface MapAddress {
  layers: MapLayers;
  module: MapModule;
  tool: AddressedTool | null;
}

/**
 * Search parameters of the map: `?sector=FR`, `?history=gained&date=3m` (a
 * step, or a day `yyyy-mm-dd`), `module=stations` for the module selected,
 * `tiles=0`, `tracks=0`, `subtiles=0` or `stations=0` for a hidden layer,
 * and `dim=1` for the dimming, off by default, on. Defaults
 * are left out.
 */
const PARAMS = {
  sector: "sector",
  history: "history",
  date: "date",
  module: "module",
  tiles: "tiles",
  tracks: "tracks",
  subtiles: "subtiles",
  stations: "stations",
  dimmed: "dim",
} as const;

const LAYER_NAMES = ["tiles", "tracks", "subtiles", "stations", "dimmed"] as const satisfies readonly (keyof MapLayers &
  keyof typeof PARAMS)[];

const HIDDEN = "0";
const SHOWN = "1";
const MODES: readonly HistoryMode[] = ["gained", "state"];
const COUNTRY_CODE = /^[A-Z]{2}$/;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** A step as written in the address, e.g. `1m` for a month. */
const stepKey = ({ unit, count }: HistoryStep) => `${count}${unit[0]}`;

/** The day of `?date=`; null when malformed, not a real day or after `today`. */
function parseDay(value: string, today: string): HistoryDay | null {
  const step = HISTORY_STEPS.findIndex((candidate) => stepKey(candidate) === value);
  if (step !== -1) return dayAtStep(step, HISTORY_STEPS.length, today);
  if (!DAY.test(value)) return null;
  const [year, month, date] = value.split("-").map(Number);
  // A day that does not exist, such as the 31st of April, comes back another.
  const real = dayOf(new Date(year, month - 1, date)) === value;
  return real && value <= today ? { step: null, day: value } : null;
}

/** A layer as `?name=0` or `?name=1`, `fallback` without the parameter; null when malformed. */
function parseLayer(value: string | null, fallback: boolean): boolean | null {
  return value === null ? fallback : value === HIDDEN ? false : value === SHOWN ? true : null;
}

/** The module named by `?module=`, the default without it; null when malformed. */
function moduleOf(params: URLSearchParams): MapModule | null {
  const value = params.get(PARAMS.module);
  if (value === null) return DEFAULT_MAP_MODULE;
  return MAP_MODULES.find((candidate) => candidate === value) ?? null;
}

/** The search of the map opened on `module` from the navigation, the rest by default. */
export function searchOfModule(module: MapModule): string {
  return searchWithAddress("", { layers: withModuleOpened(DEFAULT_MAP_LAYERS, module), module, tool: null });
}

/**
 * The layers, the module and the tool given by the address of the page, `today` being
 * the local day, `yyyy-mm-dd`. `invalid` tells that a parameter was given but
 * malformed, or that both tools were: it is then ignored.
 */
export function addressFromSearch(search: string, today: string): { address: MapAddress; invalid: boolean } {
  const params = new URLSearchParams(search);
  let invalid = false;
  const layer = (name: (typeof LAYER_NAMES)[number]) => {
    const parsed = parseLayer(params.get(PARAMS[name]), DEFAULT_MAP_LAYERS[name]);
    if (parsed === null) invalid = true;
    return parsed ?? DEFAULT_MAP_LAYERS[name];
  };
  const layers: MapLayers = {
    tiles: layer("tiles"),
    tracks: layer("tracks"),
    subtiles: layer("subtiles"),
    stations: layer("stations"),
    dimmed: layer("dimmed"),
  };

  const selected = moduleOf(params);
  if (params.has(PARAMS.module) && selected === null) invalid = true;

  const sector = params.get(PARAMS.sector);
  const history = params.get(PARAMS.history);
  const date = params.get(PARAMS.date);
  const code = sector !== null && COUNTRY_CODE.test(sector) ? sector : null;
  const mode = MODES.find((candidate) => candidate === history) ?? null;
  const defaultDay = dayAtStep(DEFAULT_STEP_INDEX, HISTORY_STEPS.length, today);
  const day = date === null ? defaultDay : parseDay(date, today);
  if ((sector !== null && !code) || (history !== null && !mode) || (date !== null && (!day || history === null))) {
    invalid = true;
  }

  let tool: AddressedTool | null = null;
  // The tools are exclusive: an address naming both opens neither.
  if (code && mode) invalid = true;
  else if (code) tool = { kind: "sector", code };
  else if (mode) tool = { kind: "history", settings: { mode, date: day ?? defaultDay } };
  return { address: { layers, module: selected ?? DEFAULT_MAP_MODULE, tool }, invalid };
}

/** The address of the page showing `address`, keeping its other parameters. */
export function searchWithAddress(search: string, { layers, module, tool }: MapAddress): string {
  const params = new URLSearchParams(search);
  for (const name of Object.values(PARAMS)) params.delete(name);
  if (tool?.kind === "sector") params.set(PARAMS.sector, tool.code);
  if (tool?.kind === "history") {
    const { mode, date } = tool.settings;
    params.set(PARAMS.history, mode);
    if (date.step === null) params.set(PARAMS.date, date.day);
    else if (date.step !== DEFAULT_STEP_INDEX) params.set(PARAMS.date, stepKey(HISTORY_STEPS[date.step]));
  }
  if (module !== DEFAULT_MAP_MODULE) params.set(PARAMS.module, module);
  for (const name of LAYER_NAMES) {
    if (layers[name] !== DEFAULT_MAP_LAYERS[name]) params.set(PARAMS[name], layers[name] ? SHOWN : HIDDEN);
  }
  return searchOf(params);
}
