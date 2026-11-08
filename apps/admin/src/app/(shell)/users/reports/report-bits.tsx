"use client";

import type { AdminUserReport, UserReportSanction, UserReportStatus } from "@kilotrace/shared/admin";
import type { UserReportReason } from "@kilotrace/shared";
import { CalendarCheckIcon, CalendarPlusIcon, CircleDotIcon, FlagIcon, GavelIcon, MessageSquareTextIcon, PanelRightOpenIcon, ShieldUserIcon, StickyNoteIcon, UserRoundIcon, UserRoundSearchIcon } from "lucide-react";
import { type DataTableColumn, dateColumn, pillsColumn, statusColumn, textColumn, type Tone, userColumn } from "@kilotrace/ui/components/admin/data-table";
import { DetailFieldButton } from "@kilotrace/ui/components/admin/detail";
import { createVersion } from "@/lib/admin/version";
import type { OpenUser } from "../use-user-panel";

/*
 * How a report is drawn, shared by its table and its detail.
 */

/** The version of the reports: the `refreshKey` of their table and of their detail. */
export const { useVersion: useReportsVersion, bump: bumpReports } = createVersion();

export const REPORT_STATUSES: Record<UserReportStatus, { label: string; tone: Tone }> = {
  open: { label: "Ouvert", tone: "red" },
  sanctioned: { label: "Sanctionné", tone: "amber" },
  dismissed: { label: "Rejeté", tone: "gray" },
};

export const REPORT_REASONS: Record<UserReportReason, { label: string; tone: Tone }> = {
  harassment: { label: "Harcèlement", tone: "red" },
  inappropriate: { label: "Contenu inapproprié", tone: "amber" },
  impersonation: { label: "Usurpation d'identité", tone: "violet" },
  spam: { label: "Spam ou publicité", tone: "blue" },
  cheating: { label: "Activités frauduleuses", tone: "green" },
  other: { label: "Autre", tone: "gray" },
};

export const REPORT_SANCTIONS: Record<UserReportSanction, { label: string; tone: Tone }> = {
  moderation: { label: "Modération", tone: "amber" },
  suspension: { label: "Suspension", tone: "red" },
  deletion: { label: "Suppression", tone: "red" },
  other: { label: "Autre", tone: "gray" },
};

function openTool(user: AdminUserReport["target"], openUser?: OpenUser) {
  if (!openUser || !user?.username) return null;
  const { id, username } = user;
  return (
    <DetailFieldButton label={`Ouvrir @${username}`} onClick={() => openUser({ id, username })}>
      <PanelRightOpenIcon aria-hidden />
    </DetailFieldButton>
  );
}

/** The columns; `openUser` adds a button opening the people named in the side panel. */
export const reportColumns = (openUser?: OpenUser): DataTableColumn<AdminUserReport>[] => [
  userColumn({ id: "target", header: "Compte signalé", icon: <UserRoundSearchIcon />, sortable: true, locked: true, empty: "Compte supprimé", value: (report) => report.target, tools: (report) => openTool(report.target, openUser) }),
  statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, sortable: true, value: (report) => report.status, statuses: REPORT_STATUSES }),
  pillsColumn({ id: "reason", header: "Raison", icon: <FlagIcon />, sortable: true, value: (report) => [REPORT_REASONS[report.reason]] }),
  textColumn({ id: "details", header: "Précisions", icon: <MessageSquareTextIcon />, sortable: true, muted: true, width: "max-w-72", value: (report) => report.details }),
  userColumn({ id: "reporter", header: "Signalé par", icon: <UserRoundIcon />, sortable: true, locked: false, empty: "Compte supprimé", value: (report) => report.reporter, tools: (report) => openTool(report.reporter, openUser) }),
  dateColumn({ id: "createdAt", header: "Date", icon: <CalendarPlusIcon />, sortable: true, value: (report) => report.createdAt }),
  pillsColumn({ id: "sanction", header: "Sanction", icon: <GavelIcon />, value: (report) => (report.sanction ? [REPORT_SANCTIONS[report.sanction]] : []) }),
  userColumn({ id: "resolver", header: "Traité par", icon: <ShieldUserIcon />, locked: false, value: (report) => report.resolver, tools: (report) => openTool(report.resolver, openUser) }),
  dateColumn({ id: "resolvedAt", header: "Traité le", icon: <CalendarCheckIcon />, sortable: true, value: (report) => report.resolvedAt }),
  textColumn({ id: "note", header: "Note de décision", icon: <StickyNoteIcon />, muted: true, width: "max-w-72", value: (report) => report.resolutionNote }),
];
