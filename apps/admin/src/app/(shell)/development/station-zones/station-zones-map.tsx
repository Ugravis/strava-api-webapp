"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { type GeoJSONSource, Map as MapLibreMap } from "maplibre-gl";
import { useTheme } from "next-themes";
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Label } from "@kilotrace/ui/components/ui/label";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { Slider } from "@kilotrace/ui/components/ui/slider";
import { Switch } from "@kilotrace/ui/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@kilotrace/ui/components/ui/toggle-group";
import { setVisitedCountries } from "@kilotrace/ui/lib/map/country-layer";
import { BASE_STYLE_URL, mapPalette, recolorStyle } from "@kilotrace/ui/lib/map/map-style";
import { stationData } from "@kilotrace/ui/lib/map/station-data";
import { addStationLayers, setHiddenGroups } from "@kilotrace/ui/lib/map/stations-layer";
import "@/lib/map/maplibre-worker";
import { adminTilesUrl } from "@/lib/map/tiles";
import { loadMapVersion } from "../../map/actions";
import {
  borders,
  boundsOf,
  figures,
  footprintFill,
  footprints,
  type PocDepartment,
  type PlansSource,
  type Precision,
  type Proposal,
  network,
  tileCells,
  tiles,
  tracks,
  zones,
} from "./station-zones-geometry";

/** Built by `scripts/station-zones-poc.mjs`, one file per département. */
const DEPARTMENTS = ["fr-13", "fr-18", "fr-48", "fr-75"] as const;
const dataUrl = (key: string) => `/development/station-zones/${key}.json`;
const VIOLET = "#7c3aed";
const HATCH = "station-zone-hatch";
const EMPTY: FeatureCollection = { type: "FeatureCollection", features: [] };

export interface StationZonesLabels {
  department: string;
  proposal: string;
  proposals: Record<Proposal, string>;
  precision: string;
  precisions: Record<Precision, string>;
  widen: string;
  asTiles: string;
  footprint: string;
  railLinks: string;
  noData: string;
  tile: string;
  sources: string;
  stations: string;
  zoneArea: string;
  tileArea: string;
  tileCount: string;
  /** What the Plans footprint is drawn from, when no platform nor building is mapped. */
  sources_: Record<Exclude<PlansSource, "osm">, string>;
}

/** Violet diagonal hatching, drawn once into the style. */
function hatchImage(size = 12) {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size * 2;
  const ctx = canvas.getContext("2d")!;
  // Opaque and light: drawn twice where zones overlap, it stays the same.
  ctx.strokeStyle = "#a78bfa";
  ctx.lineWidth = 2;
  ctx.beginPath();
  // Three strokes so that the tiles join seamlessly.
  for (const o of [-size * 2, 0, size * 2]) {
    ctx.moveTo(o, size * 2);
    ctx.lineTo(o + size * 2, 0);
  }
  ctx.stroke();
  return ctx.getImageData(0, 0, size * 2, size * 2);
}

const fmtArea = (m2: number) => `${new Intl.NumberFormat("fr-FR").format(m2)} m²`;

function ToggleField<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Record<T, string>; onChange: (v: T) => void }) {
  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <ToggleGroup variant="outline" size="sm" value={[value]} onValueChange={(v) => v[0] && onChange(v[0] as T)}>
        {(Object.keys(options) as T[]).map((k) => (
          <ToggleGroupItem key={k} value={k}>
            {options[k]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

interface Shown {
  tile: boolean;
  sources: boolean;
  footprint: boolean;
  links: boolean;
}

/** Shows the layers switched on, hides the others. */
function applyShown(map: MapLibreMap, shown: Shown) {
  const show = (layer: string, on: boolean) => map.getLayer(layer) && map.setLayoutProperty(layer, "visibility", on ? "visible" : "none");
  show("tiles-line", shown.tile);
  show("tracks-line", shown.sources);
  show("footprints-fill", shown.footprint);
  show("footprints-line", shown.footprint);
  setHiddenGroups(map, new Set(shown.links ? [] : ["rails"]));
}

function SwitchField({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <Label className="gap-2">
      <Switch checked={checked} onCheckedChange={onChange} />
      {children}
    </Label>
  );
}

export function StationZonesMap({ labels }: { labels: StationZonesLabels }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<MapLibreMap | null>(null);
  const [departments, setDepartments] = useState<PocDepartment[] | null>(null);
  const [ready, setReady] = useState(false);
  const [department, setDepartment] = useState<string>("FR-13");
  const [proposal, setProposal] = useState<Proposal>("both");
  const [precision, setPrecision] = useState<Precision>("plans");
  const [widen, setWiden] = useState(0);
  const [asTiles, setAsTiles] = useState(true);
  const [showFootprint, setShowFootprint] = useState(true);
  const [showLinks, setShowLinks] = useState(true);
  const [showTile, setShowTile] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const { resolvedTheme } = useTheme();
  const palette = useMemo(() => mapPalette(resolvedTheme), [resolvedTheme]);
  const [countries, setCountries] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    // The files are generated locally and not committed: missing ones are skipped.
    Promise.all(DEPARTMENTS.map((key) => fetch(dataUrl(key)).then((r) => (r.ok ? (r.json() as Promise<PocDepartment>) : null)).catch(() => null))).then(
      (all) => live && setDepartments(all.filter((d) => d != null)),
    );
    loadMapVersion().then(
      (versions) => live && setCountries(versions.countries),
      () => undefined,
    );
    return () => {
      live = false;
    };
  }, []);

  const stations = useMemo(() => departments?.flatMap((d) => d.stations) ?? [], [departments]);
  const allZones = useMemo(() => departments?.flatMap((d) => d.zones) ?? [], [departments]);
  const current = departments?.find((d) => d.code === department);
  const choice = useMemo(() => ({ proposal, precision, widen }), [proposal, precision, widen]);
  const zoneData = useMemo(() => zones(allZones, choice, asTiles), [allZones, choice, asTiles]);
  const cellData = useMemo(() => (asTiles ? tileCells(allZones, choice) : EMPTY), [allZones, choice, asTiles]);
  const footprintData = useMemo(() => footprints(allZones, precision), [allZones, precision]);
  const footprintFillData = useMemo(() => footprintFill(departments ?? [], precision), [departments, precision]);
  const stationFigures = useMemo(() => figures(allZones, choice), [allZones, choice]);

  const networkData = useMemo(() => stationData(departments ? network(departments) : null), [departments]);
  // Read by the map as its style loads again, with the theme.
  const shown = useMemo(() => ({ tile: showTile, sources: showSources, footprint: showFootprint, links: showLinks }), [showTile, showSources, showFootprint, showLinks]);
  const layered = useRef({ palette, countries, shown, zoneData, cellData, footprintData, footprintFillData });
  useLayoutEffect(() => {
    layered.current = { palette, countries, shown, zoneData, cellData, footprintData, footprintFillData };
  });

  useEffect(() => {
    if (!departments?.length) return;
    const map = new MapLibreMap({ container: container.current!, bounds: boundsOf(departments[0]), hash: true });
    mapRef.current = map;
    // The layers of the page under those of the site map, every one added again with the style.
    map.on("style.load", () => {
      const { palette, countries, shown, ...data } = layered.current;
      const firstLabel = map.getStyle().layers.find((layer) => layer.type === "symbol")?.id;
      if (countries) setVisitedCountries(map, { codes: [], shapesVersion: countries }, palette, ({ shapesVersion }) => adminTilesUrl("countries", shapesVersion));
      map.addImage(HATCH, hatchImage(), { pixelRatio: 2 });
      map.addSource("borders", { type: "geojson", data: borders(departments) });
      map.addSource("tiles", { type: "geojson", data: tiles(stations) });
      map.addSource("tracks", { type: "geojson", data: tracks(stations) });
      map.addSource("zones", { type: "geojson", data: data.zoneData });
      map.addSource("cells", { type: "geojson", data: data.cellData });
      map.addSource("footprints", { type: "geojson", data: data.footprintData });
      map.addSource("footprint-fill", { type: "geojson", data: data.footprintFillData });
      const add = (layer: Parameters<MapLibreMap["addLayer"]>[0]) => map.addLayer(layer, firstLabel);
      add({ id: "borders-line", type: "line", source: "borders", paint: { "line-color": palette.base.label, "line-width": 2, "line-dasharray": [4, 2], "line-opacity": 0.7 } });
      // Opaque hatching: overlapping zones are not drawn darker.
      add({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-pattern": HATCH } });
      add({ id: "cells-line", type: "line", source: "cells", paint: { "line-color": VIOLET, "line-width": 0.75, "line-opacity": 0.6 } });
      add({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": VIOLET, "line-width": 2 } });
      // Filled once from the merged footprints, outlined station by station.
      add({ id: "footprints-fill", type: "fill", source: "footprint-fill", paint: { "fill-color": VIOLET, "fill-opacity": 0.3 } });
      add({ id: "footprints-line", type: "line", source: "footprints", paint: { "line-color": "#4c1d95", "line-width": 1.5 } });
      add({ id: "tracks-line", type: "line", source: "tracks", paint: { "line-color": palette.base.label, "line-width": 1, "line-dasharray": [2, 1] } });
      add({ id: "tiles-line", type: "line", source: "tiles", paint: { "line-color": "#ea580c", "line-width": 1.5, "line-dasharray": [3, 2] } });
      // The stations and the rails of the site map, over the zones.
      addStationLayers(map, networkData, null, null, palette, true, false, firstLabel);
      applyShown(map, shown);
      setReady(true);
    });
    return () => {
      setReady(false);
      map.remove();
      mapRef.current = null;
    };
  }, [departments, stations, networkData]);

  // The base map in the colours of the theme, the layers added again once it is loaded.
  useEffect(() => {
    mapRef.current?.setStyle(BASE_STYLE_URL, { diff: false, transformStyle: (_, next) => recolorStyle(next, palette) });
  }, [palette, countries, departments]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    // Missing while the style loads again with the theme: added then with the data of the moment.
    const set = (id: string, data: FeatureCollection) => (map.getSource(id) as GeoJSONSource | undefined)?.setData(data);
    set("zones", zoneData);
    set("cells", cellData);
    set("footprints", footprintData);
    set("footprint-fill", footprintFillData);
  }, [ready, zoneData, cellData, footprintData, footprintFillData]);
  useEffect(() => {
    if (ready) applyShown(mapRef.current!, shown);
  }, [ready, shown]);

  const selectDepartment = (code: string) => {
    setDepartment(code);
    const d = departments?.find((x) => x.code === code);
    if (d) mapRef.current?.fitBounds(boundsOf(d), { padding: 24 });
  };

  if (!departments) return <Skeleton className="h-[80vh] w-full rounded-xl" />;
  if (!departments.length) return <p className="rounded-xl border bg-card p-4 text-sm text-muted-foreground">{labels.noData}</p>;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4 rounded-xl border bg-card p-4 md:flex-row md:flex-wrap md:items-end md:gap-x-6">
        <ToggleField label={labels.department} value={department} options={Object.fromEntries(departments.map((d) => [d.code, d.name]))} onChange={selectDepartment} />
        <ToggleField label={labels.proposal} value={proposal} options={labels.proposals} onChange={setProposal} />
        <ToggleField label={labels.precision} value={precision} options={labels.precisions} onChange={setPrecision} />
        <div className="flex min-w-56 flex-1 flex-col gap-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {labels.widen} : <span className="font-mono text-foreground">{widen} m</span>
          </span>
          <Slider
            value={[widen]}
            min={0}
            max={departments[0].widenMax}
            step={departments[0].widenStep}
            thumbLabel={labels.widen}
            onValueChange={(v) => setWiden(Array.isArray(v) ? v[0] : v)}
          />
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <SwitchField checked={asTiles} onChange={setAsTiles}>
            {labels.asTiles}
          </SwitchField>
          <SwitchField checked={showFootprint} onChange={setShowFootprint}>
            <span className="inline-block size-3 rounded-sm border border-violet-900 bg-violet-600/40" aria-hidden />
            {labels.footprint}
          </SwitchField>
          <SwitchField checked={showLinks} onChange={setShowLinks}>
            <span className="inline-block h-1 w-4 rounded-full" style={{ background: palette.railLink }} aria-hidden />
            {labels.railLinks}
          </SwitchField>
          <SwitchField checked={showTile} onChange={setShowTile}>
            <span className="inline-block h-0 w-4 border-t-2 border-dashed border-orange-600" aria-hidden />
            {labels.tile}
          </SwitchField>
          <SwitchField checked={showSources} onChange={setShowSources}>
            <span className="inline-block h-0 w-4 border-t border-dashed border-gray-900" aria-hidden />
            {labels.sources}
          </SwitchField>
        </div>
      </div>
      <div className="grid gap-4 lg:grid-cols-[1fr_18rem]">
        <div ref={container} className="h-[70vh] min-h-96 overflow-hidden rounded-xl border bg-muted" />
        <div className="flex max-h-[70vh] flex-col overflow-hidden rounded-xl border bg-card">
          <p className="border-b px-3 py-2 text-sm font-medium">
            {labels.stations} ({current?.stations.length ?? 0})
          </p>
          <ul className="flex-1 overflow-y-auto text-sm">
            {current?.stations.map((s) => {
              const f = stationFigures.get(s.id);
              return (
                <li key={s.id}>
                  <button
                    type="button"
                    className="flex w-full flex-col items-start px-3 py-1.5 text-left hover:bg-muted"
                    onClick={() => mapRef.current?.flyTo({ center: s.point as [number, number], zoom: 16 })}
                  >
                    <span className="font-medium">{s.name ?? `#${s.id}`}</span>
                    {s.plansSource !== "osm" && <span className="text-xs text-violet-700 dark:text-violet-300">{labels.sources_[s.plansSource]}</span>}
                    <span className="text-xs text-muted-foreground">
                      {asTiles
                        ? `${f?.tiles ?? 0} ${labels.tileCount}`
                        : `${labels.zoneArea} ${fmtArea(f?.area ?? 0)} · ${labels.tileArea} ${fmtArea(s.tileArea)}`}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
