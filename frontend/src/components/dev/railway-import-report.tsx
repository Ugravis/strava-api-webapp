"use client";

import { ExternalLinkIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { apiRequest } from "@/lib/api/client";

interface StationSample {
  osmId: number;
  name: string | null;
  lon: number;
  lat: number;
}

type Exclusion = "not_train" | "closed" | "not_served";

/** See `RailwayImportReport` in `backend/src/stations/import/stations-importer.ts`. */
interface Report {
  source: string;
  candidates: number;
  kept: number;
  /** Absent from the reports of the imports before it. */
  servedByTrack?: number;
  excluded: Record<Exclusion, number>;
  excludedSamples: Record<Exclusion, StationSample[]>;
  isolated: { count: number; samples: StationSample[] };
  links: number;
  networkKm: number;
  detours: { count: number; samples: { a: StationSample; b: StationSample; lengthKm: number; straightKm: number }[] };
  redundant?: {
    count: number;
    samples: { a: StationSample; b: StationSample; via: StationSample; lengthKm: number }[];
  };
  manyNeighbors: (StationSample & { neighbors: number })[];
  countries: { code: string; stations: number; networkKm: number }[];
  durationsS: Record<string, number>;
}

interface LatestImport {
  id: number;
  importedAt: string;
  report: Report;
}

const EXCLUSIONS: Record<Exclusion, string> = {
  not_served: "Desservie par aucune ligne de voyageurs",
  closed: "Fermée",
  not_train: "Métro, tram, funiculaire…",
};

const number = (value: number) => value.toLocaleString("fr-FR");

/** A station, linked to OpenStreetMap to check it. */
function StationLink({ station }: { station: StationSample }) {
  return (
    <a
      href={`https://www.openstreetmap.org/node/${station.osmId}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex items-center gap-1 underline-offset-4 hover:underline"
    >
      {station.name ?? <span className="text-muted-foreground italic">sans nom</span>}
      <ExternalLinkIcon className="size-3 shrink-0 text-muted-foreground" aria-hidden />
    </a>
  );
}

function Rows({ head, rows }: { head: string[]; rows: React.ReactNode[][] }) {
  if (rows.length === 0) return <p className="py-4 text-sm text-muted-foreground">Aucun.</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b text-left text-xs text-muted-foreground">
            {head.map((cell) => (
              <th key={cell} className="px-2 py-2 font-medium">
                {cell}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y">
          {rows.map((row, index) => (
            <tr key={index}>
              {row.map((cell, column) => (
                <td key={column} className="px-2 py-1.5 tabular-nums">
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Figure({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="text-lg font-semibold tabular-nums">{value}</span>
    </div>
  );
}

/** Report of the latest import of the stations, with the cases to check on OpenStreetMap. */
export function RailwayImportReport() {
  const [state, setState] = useState<{ latest: LatestImport | null } | { error: true } | null>(null);

  useEffect(() => {
    apiRequest<LatestImport | null>("/dev/railway-import").then(
      (latest) => setState({ latest }),
      () => setState({ error: true }),
    );
  }, []);

  if (!state) return <Skeleton className="h-64 w-full" />;
  if ("error" in state) return <p className="text-destructive">Impossible de charger le rapport.</p>;
  if (!state.latest) return <p className="text-muted-foreground">Aucun import : lancer `pnpm stations:import`.</p>;

  const { importedAt, report } = state.latest;
  const excludedTotal = Object.values(report.excluded).reduce((total, count) => total + count, 0);

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {report.source} · {new Date(importedAt).toLocaleString("fr-FR")}
          </CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Figure label="Gares candidates" value={number(report.candidates)} />
          <Figure label="Gares gardées" value={number(report.kept)} />
          <Figure label="Gardées sans ligne cartographiée" value={number(report.servedByTrack ?? 0)} />
          <Figure label="Gares exclues" value={number(excludedTotal)} />
          <Figure label="Gares sans voie voyageurs" value={number(report.isolated.count)} />
          <Figure label="Liaisons" value={number(report.links)} />
          <Figure label="Réseau" value={`${number(report.networkKm)} km`} />
          <Figure label="Détours refusés" value={number(report.detours.count)} />
          <Figure label="Liaisons redondantes" value={number(report.redundant?.count ?? 0)} />
          <Figure
            label="Durées"
            value={Object.entries(report.durationsS)
              .map(([step, seconds]) => `${step} ${seconds} s`)
              .join(" · ")}
          />
        </CardContent>
      </Card>

      <Tabs defaultValue="excluded">
        <TabsList className="max-w-full justify-start overflow-x-auto">
          <TabsTrigger value="excluded">Exclues</TabsTrigger>
          <TabsTrigger value="neighbors">Beaucoup de voisines</TabsTrigger>
          <TabsTrigger value="detours">Détours refusés</TabsTrigger>
          <TabsTrigger value="redundant">Redondantes</TabsTrigger>
          <TabsTrigger value="isolated">Sans voie</TabsTrigger>
          <TabsTrigger value="countries">Pays</TabsTrigger>
        </TabsList>

        <TabsContent value="excluded" className="flex flex-col gap-6">
          {(Object.keys(EXCLUSIONS) as Exclusion[]).map((reason) => (
            <section key={reason} className="flex flex-col gap-1">
              <h2 className="text-sm font-semibold">
                {EXCLUSIONS[reason]} : {number(report.excluded[reason])}
              </h2>
              <Rows
                head={["Gare", "Position"]}
                rows={report.excludedSamples[reason].map((station) => [
                  <StationLink key="s" station={station} />,
                  `${station.lat.toFixed(4)}, ${station.lon.toFixed(4)}`,
                ])}
              />
            </section>
          ))}
        </TabsContent>

        <TabsContent value="neighbors">
          <Rows
            head={["Gare", "Voisines"]}
            rows={report.manyNeighbors.map((station) => [<StationLink key="s" station={station} />, station.neighbors])}
          />
        </TabsContent>

        <TabsContent value="detours">
          <Rows
            head={["De", "À", "Par les voies", "À vol d'oiseau"]}
            rows={report.detours.samples.map(({ a, b, lengthKm, straightKm }) => [
              <StationLink key="a" station={a} />,
              <StationLink key="b" station={b} />,
              `${lengthKm} km`,
              `${straightKm} km`,
            ])}
          />
        </TabsContent>

        <TabsContent value="redundant">
          <Rows
            head={["De", "À", "Longueur", "Remplacée via"]}
            rows={(report.redundant?.samples ?? []).map(({ a, b, via, lengthKm }) => [
              <StationLink key="a" station={a} />,
              <StationLink key="b" station={b} />,
              `${lengthKm} km`,
              <StationLink key="via" station={via} />,
            ])}
          />
        </TabsContent>

        <TabsContent value="isolated">
          <Rows
            head={["Gare", "Position"]}
            rows={report.isolated.samples.map((station) => [
              <StationLink key="s" station={station} />,
              `${station.lat.toFixed(4)}, ${station.lon.toFixed(4)}`,
            ])}
          />
        </TabsContent>

        <TabsContent value="countries">
          <Rows
            head={["Pays", "Gares", "Réseau"]}
            rows={report.countries.map((country) => [country.code, number(country.stations), `${number(country.networkKm)} km`])}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
