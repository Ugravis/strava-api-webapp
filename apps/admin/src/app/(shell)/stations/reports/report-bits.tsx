"use client";

import type { StationReportDismissal, StationReportReason, StationReportStatus } from "@kilotrace/shared";
import type { AdminStationReport } from "@kilotrace/shared/admin";
import { CalendarCheck2Icon, CalendarCheckIcon, CalendarPlusIcon, CircleDotIcon, FlagIcon, FlagOffIcon, MessageSquareTextIcon, PanelRightOpenIcon, RocketIcon, ShieldCheckIcon, ShieldUserIcon, StickyNoteIcon, TrainFrontIcon, UserRoundIcon } from "lucide-react";
import { type DataTableColumn, dateColumn, pillsColumn, statusColumn, textColumn, type Tone, userColumn } from "@kilotrace/ui/components/admin/data-table";
import { DetailFieldButton } from "@kilotrace/ui/components/admin/detail";
import { createVersion } from "@/lib/admin/version";
import type { OpenUser } from "../../users/use-user-panel";
import type { OpenStation } from "../use-station-panel";

/*
 * How a report of the railway data is drawn, shared by its table and its detail.
 */

/** The version of the reports: the `refreshKey` of their table and of their detail. */
export const { useVersion: useStationReportsVersion, bump: bumpStationReports } = createVersion();

export const STATION_REPORT_STATUS_LABELS: Record<StationReportStatus, { label: string; tone: Tone }> = {
  open: { label: "Ouvert", tone: "red" },
  accepted: { label: "Pris en compte", tone: "amber" },
  done: { label: "Effectif", tone: "green" },
  dismissed: { label: "Classé sans suite", tone: "gray" },
};

export const STATION_REPORT_REASON_LABELS: Record<StationReportReason, { label: string; tone: Tone }> = {
  missing_station: { label: "Gare manquante", tone: "red" },
  railway: { label: "Voie ferrée manquante ou erronée", tone: "amber" },
  wrong_count: { label: "Gare comptabilisée à tort", tone: "violet" },
  wrong_name: { label: "Nom erroné", tone: "blue" },
  wrong_location: { label: "Mauvais emplacement", tone: "sky" },
  wrong_zone: { label: "Zone de validation incorrecte", tone: "cyan" },
  closed: { label: "Gare fermée ou inexistante", tone: "fuchsia" },
  duplicate: { label: "Doublon", tone: "green" },
  other: { label: "Autre", tone: "gray" },
};

export const STATION_REPORT_DISMISSAL_LABELS: Record<StationReportDismissal, string> = {
  already_fixed: "Déjà présent ou déjà corrigé",
  duplicate: "Doublon d'un autre signalement",
  osm_correct: "Donnée OSM correcte",
  out_of_scope: "Hors périmètre",
  unverifiable: "Impossible à vérifier",
  other: "Autre",
};

export const GENERAL_REPORT = "Signalement général";

/** The title of a report: its station, or general. */
export const reportTitle = (report: AdminStationReport) => (report.stationName ? `Signalement de ${report.stationName}` : GENERAL_REPORT);

function userTool(user: AdminStationReport["reporter"], openUser?: OpenUser) {
  if (!openUser || !user?.username) return null;
  const { id, username } = user;
  return (
    <DetailFieldButton label={`Ouvrir @${username}`} onClick={() => openUser({ id, username })}>
      <PanelRightOpenIcon aria-hidden />
    </DetailFieldButton>
  );
}

/** The columns; the openers add buttons opening the station and the people named in the side panel. */
export const stationReportColumns = (openers: { openUser?: OpenUser; openStation?: OpenStation } = {}): DataTableColumn<AdminStationReport>[] => [
  textColumn({
    id: "station",
    header: "Gare",
    icon: <TrainFrontIcon />,
    sortable: true,
    locked: true,
    value: (report) => report.stationName ?? GENERAL_REPORT,
    tools: (report) =>
      openers.openStation && report.stationId ? (
        <DetailFieldButton label="Ouvrir la gare" onClick={() => openers.openStation!({ id: report.stationId!, name: report.stationName })}>
          <PanelRightOpenIcon aria-hidden />
        </DetailFieldButton>
      ) : null,
  }),
  statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, sortable: true, value: (report) => report.status, statuses: STATION_REPORT_STATUS_LABELS }),
  pillsColumn({ id: "reason", header: "Raison", icon: <FlagIcon />, sortable: true, value: (report) => [STATION_REPORT_REASON_LABELS[report.reason]] }),
  textColumn({ id: "details", header: "Précisions", icon: <MessageSquareTextIcon />, sortable: true, muted: true, width: "max-w-72", value: (report) => report.details }),
  userColumn({ id: "reporter", header: "Signalé par", icon: <UserRoundIcon />, sortable: true, locked: false, empty: "Compte supprimé", value: (report) => report.reporter, tools: (report) => userTool(report.reporter, openers.openUser) }),
  dateColumn({ id: "createdAt", header: "Date", icon: <CalendarPlusIcon />, sortable: true, value: (report) => report.createdAt }),
  pillsColumn({ id: "dismissal", header: "Motif du rejet", icon: <FlagOffIcon />, value: (report) => (report.dismissal ? [{ label: STATION_REPORT_DISMISSAL_LABELS[report.dismissal], tone: "gray" }] : []) }),
  userColumn({ id: "resolver", header: "Traité par", icon: <ShieldUserIcon />, locked: false, value: (report) => report.resolver, tools: (report) => userTool(report.resolver, openers.openUser) }),
  dateColumn({ id: "resolvedAt", header: "Traité le", icon: <CalendarCheckIcon />, sortable: true, value: (report) => report.resolvedAt }),
  textColumn({ id: "note", header: "Note de décision", icon: <StickyNoteIcon />, muted: true, width: "max-w-72", value: (report) => report.resolutionNote }),
  userColumn({ id: "completer", header: "Rendu effectif par", icon: <ShieldCheckIcon />, locked: false, value: (report) => report.completer, tools: (report) => userTool(report.completer, openers.openUser) }),
  dateColumn({ id: "completedAt", header: "Effectif le", icon: <CalendarCheck2Icon />, sortable: true, value: (report) => report.completedAt }),
  textColumn({ id: "completionNote", header: "Note de mise en ligne", icon: <RocketIcon />, muted: true, width: "max-w-72", value: (report) => report.completionNote }),
];
