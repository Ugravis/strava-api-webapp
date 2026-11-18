"use client";

import { CircleCheckIcon, CircleXIcon, FlagIcon, FlagOffIcon, MapIcon, PanelRightOpenIcon, ThumbsUpIcon } from "lucide-react";
import { useMemo } from "react";
import { formatDateTime } from "@kilotrace/ui/components/admin/data-table";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  DetailHeader,
  DetailHistory,
  DetailLoader,
  DetailMedia,
  DetailRelated,
  DetailSection,
  DetailSkeleton,
  type RowPanelControls,
} from "@kilotrace/ui/components/admin/detail";
import { stationMapHref } from "@/config/site-links";
import { loadUserHistory } from "../../users/actions";
import { useOpenUser } from "../../users/use-user-panel";
import type { StationRights } from "../station-bits";
import { useOpenStation } from "../use-station-panel";
import { loadRelatedStationReports, loadStationReportDetail, type StationReportDetailData } from "./actions";
import { reportTitle, STATION_REPORT_REASON_LABELS, STATION_REPORT_STATUS_LABELS, stationReportColumns, useStationReportsVersion } from "./report-bits";
import { acceptanceOf, completionOf, dismissalOf, STATION_REPORTS_NOT_GRANTED } from "./report-decisions";

/** The report loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function StationReportRowPanel({ id, rights, panel }: { id: string; rights: StationRights; panel: RowPanelControls }) {
  const version = useStationReportsVersion();
  return (
    <DetailLoader id={id} load={loadStationReportDetail} refreshKey={version} skeleton={<DetailSkeleton media actions={3} sections={[6, 4, 2]} />}>
      {(data) => <StationReportDetail data={data} rights={rights} panel={panel} />}
    </DetailLoader>
  );
}

/** Everything about a report; open or accepted, the decisions on it. */
function StationReportDetail({ data, rights, panel }: { data: StationReportDetailData; rights: StationRights; panel: RowPanelControls }) {
  const { report, canHandle } = data;
  const openUser = useOpenUser();
  const openStation = useOpenStation(rights);
  const version = useStationReportsVersion();
  const columns = useMemo(() => stationReportColumns({ openUser, openStation }), [openUser, openStation]);
  const lock = canHandle ? null : STATION_REPORTS_NOT_GRANTED;
  const accept = acceptanceOf(report);
  const dismiss = dismissalOf(report);
  const complete = completionOf(report);
  const station = report.stationId ? { id: report.stationId, name: report.stationName } : null;

  return (
    <>
      <DetailHeader
        media={<DetailMedia icon={<FlagIcon />} />}
        title={reportTitle(report)}
        subtitle={`${STATION_REPORT_REASON_LABELS[report.reason].label} · ${STATION_REPORT_STATUS_LABELS[report.status].label}`}
        actions={station && <DetailAction label="Voir sur la carte du site" icon={<MapIcon aria-hidden />} href={stationMapHref(station.id)} />}
      />
      {(report.status === "open" || report.status === "accepted" || station) && (
        <DetailActions>
          {report.status === "open" && (
            <>
              <DetailAction label="Accepter" icon={<ThumbsUpIcon aria-hidden />} locked={lock} confirm={accept.confirm} onClick={accept.run} />
              <DetailAction label="Classer sans suite" icon={<FlagOffIcon aria-hidden />} locked={lock} confirm={dismiss.confirm} onClick={dismiss.run} />
            </>
          )}
          {report.status === "accepted" && <DetailAction label="Fait · Prévenir le membre" icon={<CircleCheckIcon aria-hidden />} locked={lock} confirm={complete.confirm} onClick={complete.run} />}
          {station && <DetailAction label="Ouvrir la gare" icon={<PanelRightOpenIcon aria-hidden />} onClick={() => openStation(station)} />}
        </DetailActions>
      )}
      <DetailSection title="Signalement">
        <DetailColumnFields row={report} columns={columns} ids={["status", "reason", { id: "details", stacked: true }, "station", "reporter", "createdAt"]} />
      </DetailSection>
      {report.status !== "open" && (
        <DetailSection title="Décision">
          <DetailColumnFields row={report} columns={columns} ids={[...(report.status === "dismissed" ? ["dismissal"] : []), "resolver", "resolvedAt", { id: "note", stacked: true }]} />
        </DetailSection>
      )}
      {report.status === "done" && (
        <DetailSection title="Mise en ligne">
          <DetailColumnFields row={report} columns={columns} ids={["completer", "completedAt", { id: "completionNote", stacked: true }]} />
        </DetailSection>
      )}
      {station && (
        <DetailSection title="Autres signalements sur cette gare">
          <DetailRelated
            refreshKey={version}
            empty="Aucun autre signalement sur cette gare."
            load={(offset) =>
              loadRelatedStationReports(report.id, offset).then(({ reports, total }) => ({
                total,
                items: reports.map((other) => ({
                  id: other.id,
                  title: STATION_REPORT_REASON_LABELS[other.reason].label,
                  subtitle: `${STATION_REPORT_STATUS_LABELS[other.status].label} · ${formatDateTime(other.createdAt)}`,
                  onOpen: () => panel.open(other.id),
                })),
              }))
            }
          />
        </DetailSection>
      )}
      <DetailSection title="Historique">
        <DetailHistory
          refreshKey={version}
          empty="Aucune décision sur ce signalement."
          load={(cursor) =>
            loadUserHistory(report.id, cursor).then(({ entries, next, total }) => ({
              next,
              total,
              events: entries.map((entry) => ({
                id: entry.id,
                icon: entry.succeeded ? <CircleCheckIcon /> : <CircleXIcon />,
                tone: entry.succeeded ? "default" : "red",
                title: entry.label,
                date: entry.createdAt,
                details: entry.actor && <span className="block">par {entry.actor.displayName ?? entry.actor.username ?? "—"}</span>,
              })),
            }))
          }
        />
      </DetailSection>
    </>
  );
}
