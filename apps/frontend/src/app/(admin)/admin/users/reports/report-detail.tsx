"use client";

import { CheckCheckIcon, CircleCheckIcon, CircleXIcon, ExternalLinkIcon, FlagIcon, FlagOffIcon } from "lucide-react";
import Link from "next/link";
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
import { UserAvatar } from "@kilotrace/ui/components/user/user-avatar";
import { userProfileHref } from "@/config/routes";
import { loadUserHistory } from "../actions";
import { useOpenUser } from "../use-user-panel";
import { userActionsOf, useUserActionDialog } from "../user-actions";
import { UserProfileSection } from "../user-detail";
import { useUsersVersion } from "../users-store";
import { loadRelatedReports, loadReportDetail, type ReportDetailData } from "./actions";
import { REPORT_REASONS, REPORT_STATUSES, reportColumns, useReportsVersion } from "./report-bits";
import { closingOf, REPORTS_NOT_GRANTED, SANCTIONS, useSanctionDialog } from "./report-decisions";

/** The report loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function ReportRowPanel({ id, panel }: { id: string; panel: RowPanelControls }) {
  const reports = useReportsVersion();
  const users = useUsersVersion();
  return (
    <DetailLoader id={id} load={loadReportDetail} refreshKey={`${reports}:${users}`} skeleton={<DetailSkeleton media actions={5} sections={[6, 7, 2]} />}>
      {(data) => <ReportDetail data={data} panel={panel} />}
    </DetailLoader>
  );
}

/** Everything about a report; open, the decisions on it. */
function ReportDetail({ data, panel }: { data: ReportDetailData; panel: RowPanelControls }) {
  const { report, target, canHandle } = data;
  const openUser = useOpenUser();
  const version = useReportsVersion();
  const columns = useMemo(() => reportColumns(openUser), [openUser]);
  const { openSanction, dialog } = useSanctionDialog();
  // A closed report, or a member who may not decide: the gavels moderate the account alone.
  const plain = useUserActionDialog(() => {});
  const open = report.status === "open";
  const deciding = open && canHandle;
  const sanctions = target ? userActionsOf(target.user, target.permissions, target.refusal).filter((action) => SANCTIONS[action.key]) : [];
  const handleLock = canHandle ? null : REPORTS_NOT_GRANTED;
  const mark = closingOf(report, "mark");
  const dismiss = closingOf(report, "dismiss");

  return (
    <>
      <DetailHeader
        media={target ? <UserAvatar user={target.user} className="size-14" /> : <DetailMedia icon={<FlagIcon />} />}
        title={`Signalement de @${report.targetUsername}`}
        subtitle={`${REPORT_REASONS[report.reason].label} · ${REPORT_STATUSES[report.status].label}`}
        actions={target && <DetailAction label="Voir le profil public" icon={<ExternalLinkIcon aria-hidden />} href={userProfileHref(target.user.username)} />}
      />
      {open && (
        <DetailActions>
          {sanctions.map((action) => (
            <DetailAction
              key={action.key}
              label={action.label}
              icon={action.icon}
              variant={action.destructive ? "destructive" : "outline"}
              locked={handleLock ?? action.locked}
              onClick={() => openSanction(report.id, target!.user, action.key)}
            />
          ))}
          <DetailAction label="Marquer sanctionné" icon={<CheckCheckIcon aria-hidden />} locked={handleLock} confirm={mark.confirm} onClick={mark.run} />
          <DetailAction label="Rejeter" icon={<FlagOffIcon aria-hidden />} locked={handleLock} confirm={dismiss.confirm} onClick={dismiss.run} />
        </DetailActions>
      )}
      <DetailSection title="Signalement">
        <DetailColumnFields row={report} columns={columns} ids={["status", "reason", { id: "details", stacked: true }, "reporter", "target", "createdAt"]} />
      </DetailSection>
      {!open && (
        <DetailSection title="Décision">
          <DetailColumnFields row={report} columns={columns} ids={["sanction", "resolver", "resolvedAt", { id: "note", stacked: true }]} />
        </DetailSection>
      )}
      {target && (
        <UserProfileSection
          user={target.user}
          permissions={target.permissions}
          refusal={target.refusal}
          openAction={(user, key, fields) => (deciding && SANCTIONS[key] ? openSanction(report.id, user, key, fields) : plain.openAction(user, key, fields))}
        />
      )}
      {report.target && (
        <DetailSection title="Autres signalements sur ce compte">
          <DetailRelated
            refreshKey={version}
            empty="Aucun autre signalement sur ce compte."
            load={(offset) =>
              loadRelatedReports(report.id, offset).then(({ reports, total }) => ({
                total,
                items: reports.map((other) => ({
                  id: other.id,
                  title: REPORT_REASONS[other.reason].label,
                  subtitle: `${REPORT_STATUSES[other.status].label} · ${formatDateTime(other.createdAt)}`,
                  onOpen: () => panel.open(other.id),
                })),
              }))
            }
          />
        </DetailSection>
      )}
      <DetailSection
        title="Historique"
        aside={
          target && (
            <Link href={target.historyHref} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
              Journal du compte
            </Link>
          )
        }
      >
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
                details: (entry.actor || entry.reason) && (
                  <>
                    {entry.actor && <span className="block">par {entry.actor.displayName ?? entry.actor.username ?? "—"}</span>}
                    {entry.reason && <span className="block">« {entry.reason} »</span>}
                  </>
                ),
              })),
            }))
          }
        />
      </DetailSection>
      {dialog}
      {plain.dialog}
    </>
  );
}
