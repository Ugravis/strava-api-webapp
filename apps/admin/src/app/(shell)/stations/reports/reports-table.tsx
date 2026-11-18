"use client";

import { STATION_REPORT_DISMISSALS, STATION_REPORT_REASONS, type StationReportReason, type StationReportStatus } from "@kilotrace/shared";
import type { AdminStationReport } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CircleCheckIcon, CopyIcon, FlagOffIcon, MapIcon, PanelRightOpenIcon, ThumbsUpIcon, TrainFrontIcon } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { type DataTableConfig, DataTable, RowActions, useConfirmDialog } from "@kilotrace/ui/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@kilotrace/ui/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@kilotrace/ui/components/ui/dropdown-menu";
import { stationMapHref } from "@/config/site-links";
import { useOpenUser } from "../../users/use-user-panel";
import type { StationRights } from "../station-bits";
import { useOpenStation } from "../use-station-panel";
import { fetchStationReportsTable, loadStationReport } from "./actions";
import { reportTitle, STATION_REPORT_DISMISSAL_LABELS, STATION_REPORT_REASON_LABELS, STATION_REPORT_STATUS_LABELS, stationReportColumns, useStationReportsVersion } from "./report-bits";
import { acceptanceOf, completionOf, dismissalOf } from "./report-decisions";
import { StationReportRowPanel } from "./report-detail";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The reports of the railway data, those open by default; a click opens one in the side panel. */
export function StationReportsTable({ rights: given, canHandle }: { rights: StationRights; canHandle: boolean }) {
  // New objects after each refresh of the page: kept while their values are the same.
  const rights = useMemo(() => given, [given.edit]); // eslint-disable-line react-hooks/exhaustive-deps
  const version = useStationReportsVersion();
  const openUser = useOpenUser();
  const openStation = useOpenStation(rights);
  const { ask, dialog } = useConfirmDialog();
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<RowPanelControls | null>(null);
  const config = useMemo<DataTableConfig<AdminStationReport>>(
    () => ({
      id: "station-reports",
      fetch: (query: TableQuery) => fetchStationReportsTable(query),
      rowId: (report) => report.id,
      muted: (report) => report.status === "dismissed" || report.status === "done",
      search: "Gare, pseudo ou précisions",
      noun: (count) => (count > 1 ? "signalements" : "signalement"),
      empty: { title: "Aucun signalement", description: "Les signalements envoyés depuis la carte apparaîtront ici." },
      emptyFiltered: ({ filters, search }) =>
        !search && filters.status?.length === 1 && filters.status[0] === "open" && Object.entries(filters).every(([id, values]) => id === "status" || values.length === 0)
          ? { title: "Aucun signalement ouvert", description: "Les données ferroviaires sont à jour." }
          : null,
      defaultSort: { id: "createdAt", desc: true },
      defaultFilters: { status: ["open"] },
      pageSize: 12,
      views: [
        { id: "compact", label: "Table compacte", columns: ["station", "status", "reason", "details", "reporter", "createdAt"] },
        { id: "detailed", label: "Table détaillée", columns: ["station", "status", "reason", "details", "reporter", "createdAt", "dismissal", "resolver", "resolvedAt", "note", "completedAt", "completionNote"] },
      ],
      columns: stationReportColumns({ openUser, openStation }),
      facets: [
        { id: "status", label: "Statut", options: Object.entries(STATION_REPORT_STATUS_LABELS).map(([value, { label }]) => ({ value, label })) },
        { id: "reason", label: "Raison", options: STATION_REPORT_REASONS.map((value) => ({ value, label: STATION_REPORT_REASON_LABELS[value].label })) },
        { id: "dismissal", label: "Motif du rejet", options: STATION_REPORT_DISMISSALS.map((value) => ({ value, label: STATION_REPORT_DISMISSAL_LABELS[value] })) },
      ],
      groupings: [
        { id: "status", label: "Statut", title: (key) => STATION_REPORT_STATUS_LABELS[key as StationReportStatus]?.label ?? key },
        { id: "reason", label: "Raison", title: (key) => STATION_REPORT_REASON_LABELS[key as StationReportReason]?.label ?? key },
        { id: "station", label: "Gare", title: (key) => key || "Signalements généraux" },
      ],
      actions: (report) => {
        const decisions = [
          ...(report.status === "open"
            ? [
                { key: "accept", label: "Accepter", icon: <ThumbsUpIcon />, decision: acceptanceOf(report) },
                { key: "dismiss", label: "Classer sans suite", icon: <FlagOffIcon />, decision: dismissalOf(report) },
              ]
            : []),
          ...(report.status === "accepted" ? [{ key: "complete", label: "Fait · Prévenir le membre", icon: <CircleCheckIcon />, decision: completionOf(report) }] : []),
        ];
        return (
          <RowActions label={`Actions du ${reportTitle(report).toLowerCase()}`}>
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => panelRef.current?.open(report.id)}>
                <PanelRightOpenIcon />
                Ouvrir la fiche
              </DropdownMenuItem>
              {report.stationId && (
                <>
                  <DropdownMenuItem onClick={() => openStation({ id: report.stationId!, name: report.stationName })}>
                    <TrainFrontIcon />
                    Ouvrir la gare
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => window.open(stationMapHref(report.stationId!), "_blank", "noopener")}>
                    <MapIcon />
                    Voir sur la carte du site
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuGroup>
            {/* The buttons of the detail, those the member may run. */}
            {canHandle && decisions.length > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  {decisions.map(({ key, label, icon, decision }) => (
                    <DropdownMenuItem key={key} onClick={() => ask(decision.confirm, decision.run)}>
                      {icon}
                      {label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuGroup>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => copy(report.id, "ID copié")}>
                <CopyIcon />
                Copier l&apos;ID
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </RowActions>
        );
      },
    }),
    [openUser, openStation, ask, canHandle],
  );
  const panel = useRowPanel<AdminStationReport>({
    config,
    title: reportTitle,
    load: loadStationReport,
    detail: (id, controls) => <StationReportRowPanel id={id} rights={rights} panel={controls} />,
  });
  useLayoutEffect(() => {
    panelRef.current = panel;
  });
  return (
    <>
      <DataTable {...panel.table} refreshKey={version} />
      {dialog}
    </>
  );
}
