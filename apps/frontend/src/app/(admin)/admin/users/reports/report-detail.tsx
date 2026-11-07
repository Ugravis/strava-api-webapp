"use client";

import { ADMIN_REASON_MAX_LENGTH, ADMIN_REASON_MIN_LENGTH, type AdminUserSummary, type UserReportSanction } from "@kilotrace/shared/admin";
import { CheckCheckIcon, CircleCheckIcon, CircleXIcon, ExternalLinkIcon, FlagIcon, FlagOffIcon } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { ActionDialog } from "@/components/admin/action-dialog";
import { formatDateTime } from "@/components/admin/data-table";
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
} from "@/components/admin/detail";
import { UserAvatar } from "@/components/user/user-avatar";
import { userProfileHref } from "@/config/routes";
import { loadUserHistory } from "../actions";
import { useOpenUser } from "../use-user-panel";
import { dialogOf, userActionsOf, type UserActionKey } from "../user-actions";
import { bumpUsers, useUsersVersion } from "../users-store";
import { closeReportAsSanctioned, dismissReport, loadRelatedReports, loadReportDetail, type ReportDetailData, sanctionReport } from "./actions";
import { bumpReports, REPORT_REASONS, REPORT_STATUSES, reportColumns, useReportsVersion } from "./report-bits";

const NOT_GRANTED = "Votre rôle n'a pas la permission de traiter les signalements.";

/** The actions on the account taken as a sanction, by the sanction they record. */
const SANCTIONS: Partial<Record<UserActionKey, UserReportSanction>> = { moderate: "moderation", suspend: "suspension", delete: "deletion" };

const reasonOptions = (presets: string[]) => ({
  label: "Raison",
  placeholder: "Expliquez la décision, elle est consignée dans le journal.",
  required: true,
  minLength: ADMIN_REASON_MIN_LENGTH,
  maxLength: ADMIN_REASON_MAX_LENGTH,
  presets,
});

/** The report loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function ReportRowPanel({ id, panel }: { id: string; panel: RowPanelControls }) {
  const reports = useReportsVersion();
  const users = useUsersVersion();
  return (
    <DetailLoader id={id} load={loadReportDetail} refreshKey={`${reports}:${users}`} skeleton={<DetailSkeleton media actions={3} sections={[5, 3, 2]} />}>
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
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [dialog, setDialog] = useState<{ user: AdminUserSummary; key: UserActionKey; open: boolean } | null>(null);
  const open = report.status === "open";
  const done = () => {
    bumpReports();
    bumpUsers();
  };
  const sanctions = target ? userActionsOf(target.user, target.permissions, target.refusal).filter((action) => SANCTIONS[action.key]) : [];
  const decide = (run: (reason: string) => ReturnType<typeof dismissReport>) => async (reason: string | undefined) => {
    const result = await run(reason ?? "");
    if (result.ok) done();
    return result;
  };
  const handleLock = canHandle ? null : NOT_GRANTED;
  const sanction = dialog && SANCTIONS[dialog.key];

  return (
    <>
      <DetailHeader
        media={target ? <UserAvatar user={target.user} className="size-14" /> : <DetailMedia icon={<FlagIcon />} />}
        title={`Signalement de @${report.targetUsername}`}
        subtitle={`${REPORT_REASONS[report.reason].label} · ${REPORT_STATUSES[report.status].label}`}
        actions={target && <DetailAction label="Voir le profil public" icon={<ExternalLinkIcon aria-hidden />} href={userProfileHref(target.user.username)} />}
      />
      {open && (
        <>
          {sanctions.length > 0 && (
            <DetailActions>
              {sanctions.map((action) => (
                <DetailAction
                  key={action.key}
                  label={action.label}
                  icon={action.icon}
                  variant={action.destructive ? "destructive" : "outline"}
                  locked={handleLock ?? action.locked}
                  onClick={() => setDialog({ user: target!.user, key: action.key, open: true })}
                />
              ))}
            </DetailActions>
          )}
          <DetailActions>
            <DetailAction
              label="Marquer sanctionné"
              icon={<CheckCheckIcon aria-hidden />}
              locked={handleLock}
              confirm={{
                title: "Clore comme sanctionné ?",
                description: "Le compte reste tel quel : à utiliser pour une sanction déjà prise. Tous les signalements ouverts sur ce compte sont clos et leurs auteurs prévenus.",
                confirmLabel: "Clore",
                destructive: false,
                reason: reasonOptions(["Déjà suspendu", "Avertissement envoyé", "Déjà modéré"]),
              }}
              onClick={decide((reason) => closeReportAsSanctioned(report.id, reason))}
            />
            <DetailAction
              label="Rejeter"
              icon={<FlagOffIcon aria-hidden />}
              locked={handleLock}
              confirm={{
                title: "Rejeter ce signalement ?",
                description: "Aucune sanction n'est prise. Seul ce signalement est clos, son auteur en est prévenu et pourra en envoyer un autre.",
                confirmLabel: "Rejeter",
                destructive: false,
                reason: reasonOptions(["Aucune infraction constatée", "Signalement abusif", "Doublon"]),
              }}
              onClick={decide((reason) => dismissReport(report.id, reason))}
            />
          </DetailActions>
        </>
      )}
      <DetailSection title="Signalement">
        <DetailColumnFields row={report} columns={columns} ids={["status", "reason", { id: "details", stacked: true }, "reporter", "createdAt", "target"]} />
      </DetailSection>
      {!open && (
        <DetailSection title="Décision">
          <DetailColumnFields row={report} columns={columns} ids={["sanction", "resolver", "resolvedAt", { id: "note", stacked: true }]} />
        </DetailSection>
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
      {dialog && sanction && (
        <ActionDialog
          {...dialogOf(dialog.key, dialog.user)}
          action={sanctionReport.bind(null, report.id, sanction)}
          cancelLabel="Annuler"
          open={dialog.open}
          onOpenChange={(next) => setDialog({ ...dialog, open: next })}
          onSuccess={done}
        />
      )}
    </>
  );
}
