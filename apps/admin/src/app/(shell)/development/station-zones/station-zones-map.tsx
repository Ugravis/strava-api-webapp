"use client";

import "maplibre-gl/dist/maplibre-gl.css";
import type { FeatureCollection } from "geojson";
import { type GeoJSONSource, Map as MapLibreMap, setWorkerUrl } from "maplibre-gl";
import { useEffect, useMemo, useRef, useState } from "react";
import { Label } from "@kilotrace/ui/components/ui/label";
import { Skeleton } from "@kilotrace/ui/components/ui/skeleton";
import { Slider } from "@kilotrace/ui/components/ui/slider";
import { Switch } from "@kilotrace/ui/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@kilotrace/ui/components/ui/toggle-group";
import {
  borders,
  boundsOf,
  figures,
  footprintFill,
  footprints,
  type PocDepartment,
  type Precision,
  type Proposal,
  points,
  railLinks,
  tileCells,
  tiles,
  tracks,
  zones,
} from "./station-zones-geometry";

// MapLibre derives its worker URL from its own location at runtime, which the
// bundler cannot follow: the worker is declared here so that it is emitted.
setWorkerUrl(new URL("maplibre-gl/dist/maplibre-gl-worker.mjs", import.meta.url).href);

const STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
/** Built by `scripts/station-zones-poc.mjs`, one file per département. */
const DEPARTMENTS = ["fr-13", "fr-18", "fr-75"] as const;
const dataUrl = (key: string) => `/development/station-zones/${key}.json`;
const VIOLET = "#7c3aed";
const HATCH = "station-zone-hatch";
/** Colour of the rail links on the site map (palette.railLink). */
const RAIL_LINK = "#6d28d9";
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
  const [showTile, setShowTile] = useState(true);
  const [showSources, setShowSources] = useState(true);

  useEffect(() => {
    let live = true;
    // The files are generated locally and not committed: missing ones are skipped.
    Promise.all(DEPARTMENTS.map((key) => fetch(dataUrl(key)).then((r) => (r.ok ? (r.json() as Promise<PocDepartment>) : null)).catch(() => null))).then(
      (all) => live && setDepartments(all.filter((d) => d != null)),
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

  useEffect(() => {
    if (!departments?.length) return;
    const map = new MapLibreMap({ container: container.current!, style: STYLE_URL, bounds: boundsOf(departments[0]), hash: true });
    mapRef.current = map;
    map.on("load", () => {
      map.addImage(HATCH, hatchImage(), { pixelRatio: 2 });
      map.addSource("borders", { type: "geojson", data: borders(departments) });
      map.addSource("tiles", { type: "geojson", data: tiles(stations) });
      map.addSource("tracks", { type: "geojson", data: tracks(stations) });
      map.addSource("zones", { type: "geojson", data: EMPTY });
      map.addSource("cells", { type: "geojson", data: EMPTY });
      map.addSource("footprints", { type: "geojson", data: EMPTY });
      map.addSource("footprint-fill", { type: "geojson", data: EMPTY });
      map.addSource("links", { type: "geojson", data: railLinks(departments) });
      map.addSource("points", { type: "geojson", data: points(stations) });
      map.addLayer({ id: "borders-line", type: "line", source: "borders", paint: { "line-color": "#0f172a", "line-width": 2, "line-dasharray": [4, 2], "line-opacity": 0.7 } });
      map.addLayer({ id: "links-casing", type: "line", source: "links", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": "#ffffff", "line-width": 5 } });
      map.addLayer({ id: "links-line", type: "line", source: "links", layout: { "line-cap": "round", "line-join": "round" }, paint: { "line-color": RAIL_LINK, "line-width": 2.5 } });
      // Opaque hatching: overlapping zones are not drawn darker.
      map.addLayer({ id: "zones-fill", type: "fill", source: "zones", paint: { "fill-pattern": HATCH } });
      map.addLayer({ id: "cells-line", type: "line", source: "cells", paint: { "line-color": VIOLET, "line-width": 0.75, "line-opacity": 0.6 } });
      map.addLayer({ id: "zones-line", type: "line", source: "zones", paint: { "line-color": VIOLET, "line-width": 2 } });
      // Filled once from the merged footprints, outlined station by station.
      map.addLayer({ id: "footprints-fill", type: "fill", source: "footprint-fill", paint: { "fill-color": VIOLET, "fill-opacity": 0.3 } });
      map.addLayer({ id: "footprints-line", type: "line", source: "footprints", paint: { "line-color": "#4c1d95", "line-width": 1.5 } });
      map.addLayer({ id: "tracks-line", type: "line", source: "tracks", paint: { "line-color": "#111827", "line-width": 1, "line-dasharray": [2, 1] } });
      map.addLayer({ id: "tiles-line", type: "line", source: "tiles", paint: { "line-color": "#ea580c", "line-width": 1.5, "line-dasharray": [3, 2] } });
      map.addLayer({
        id: "points-circle",
        type: "circle",
        source: "points",
        paint: { "circle-radius": 4, "circle-color": "#111827", "circle-stroke-color": "#fff", "circle-stroke-width": 1.5 },
      });
      map.addLayer({
        id: "points-label",
        type: "symbol",
        source: "points",
        minzoom: 11,
        layout: { "text-field": ["get", "name"], "text-font": ["Noto Sans Regular"], "text-size": 12, "text-offset": [0, 1.2], "text-anchor": "top" },
        paint: { "text-color": "#111827", "text-halo-color": "#fff", "text-halo-width": 1.5 },
      });
      setReady(true);
    });
    return () => {
      setReady(false);
      map.remove();
    };
  }, [departments, stations]);

  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    (map.getSource("zones") as GeoJSONSource).setData(zoneData);
    (map.getSource("cells") as GeoJSONSource).setData(cellData);
    (map.getSource("footprints") as GeoJSONSource).setData(footprintData);
    (map.getSource("footprint-fill") as GeoJSONSource).setData(footprintFillData);
  }, [ready, zoneData, cellData, footprintData, footprintFillData]);
  useEffect(() => {
    if (!ready) return;
    const map = mapRef.current!;
    const show = (layer: string, on: boolean) => map.setLayoutProperty(layer, "visibility", on ? "visible" : "none");
    show("tiles-line", showTile);
    show("tracks-line", showSources);
    show("footprints-fill", showFootprint);
    show("footprints-line", showFootprint);
    show("links-casing", showLinks);
    show("links-line", showLinks);
  }, [ready, showTile, showSources, showFootprint, showLinks]);

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
            <span className="inline-block h-1 w-4 rounded-full bg-violet-700" aria-hidden />
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
