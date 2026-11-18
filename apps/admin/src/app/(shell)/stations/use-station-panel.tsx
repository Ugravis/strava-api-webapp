"use client";

import { useCallback } from "react";
import { useSplitPanel } from "@kilotrace/ui/components/split-panel";
import type { StationRights } from "./station-bits";
import { StationRowPanel } from "./station-detail";

export type OpenStation = (station: { id: string; name: string | null }) => void;

/**
 * Opens a station in the side panel from another table of the page (a
 * report), its neighbors opened there too. Station ids never meet the uuids of the reports.
 */
export function useOpenStation(rights: StationRights): OpenStation {
  const { open } = useSplitPanel();
  return useCallback(
    (station) => {
      const show = (id: string, title: string) => open(<StationRowPanel id={id} rights={rights} panel={{ open: (next) => show(next, "Gare") }} />, { id, title });
      show(station.id, station.name ?? "Sans nom");
    },
    [open, rights],
  );
}
