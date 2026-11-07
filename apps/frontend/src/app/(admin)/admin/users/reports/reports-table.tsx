"use client";

import { USER_REPORT_REASONS } from "@kilotrace/shared";
import type { AdminUserReport, UserReportStatus } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { CopyIcon, ExternalLinkIcon, PanelRightOpenIcon } from "lucide-react";
import { useLayoutEffect, useMemo, useRef } from "react";
import { toast } from "sonner";
import { type DataTableConfig, DataTable, RowActions } from "@/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { userProfileHref } from "@/config/routes";
import { useOpenUser } from "../use-user-panel";
import { fetchReportsTable, loadReport } from "./actions";
import { REPORT_REASONS, REPORT_STATUSES, reportColumns, useReportsVersion } from "./report-bits";
import { ReportRowPanel } from "./report-detail";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The reports, those open by default; a click opens one in the side panel. */
export function ReportsTable() {
  const version = useReportsVersion();
  const openUser = useOpenUser();
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<RowPanelControls | null>(null);
  const config = useMemo<DataTableConfig<AdminUserReport>>(
    () => ({
      id: "reports",
      fetch: (query: TableQuery) => fetchReportsTable(query),
      rowId: (report) => report.id,
      muted: (report) => report.status === "dismissed",
      search: "Pseudo ou précisions",
      noun: (count) => (count > 1 ? "signalements" : "signalement"),
      empty: { title: "Aucun signalement", description: "Les signalements envoyés depuis les profils apparaîtront ici." },
      defaultSort: { id: "createdAt", desc: true },
      defaultFilters: { status: ["open"] },
      pageSize: 5,
      views: [
        { id: "compact", label: "Table compacte", columns: ["target", "status", "reason", "details", "reporter", "createdAt"] },
        { id: "detailed", label: "Table détaillée", columns: ["target", "status", "reason", "details", "reporter", "createdAt", "sanction", "resolver", "resolvedAt", "note"] },
      ],
      columns: reportColumns(openUser),
      facets: [
        { id: "status", label: "Statut", options: Object.entries(REPORT_STATUSES).map(([value, { label }]) => ({ value, label })) },
        { id: "reason", label: "Raison", options: USER_REPORT_REASONS.map((value) => ({ value, label: REPORT_REASONS[value].label })) },
      ],
      groupings: [
        { id: "status", label: "Statut", title: (key) => REPORT_STATUSES[key as UserReportStatus]?.label ?? key },
        { id: "reason", label: "Raison", title: (key) => REPORT_REASONS[key as keyof typeof REPORT_REASONS]?.label ?? key },
        { id: "target", label: "Compte signalé", title: (key) => `@${key}` },
      ],
      actions: (report) => (
        <RowActions label={`Actions du signalement de @${report.targetUsername}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => panelRef.current?.open(report.id)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            {report.target?.username && (
              <DropdownMenuItem onClick={() => window.open(userProfileHref(report.target!.username!), "_blank", "noopener")}>
                <ExternalLinkIcon />
                Voir le profil public
              </DropdownMenuItem>
            )}
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => copy(report.id, "ID copié")}>
              <CopyIcon />
              Copier l&apos;ID
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </RowActions>
      ),
    }),
    [openUser],
  );
  const panel = useRowPanel<AdminUserReport>({
    config,
    title: (report) => `Signalement de @${report.targetUsername}`,
    load: loadReport,
    detail: (id, controls) => <ReportRowPanel id={id} panel={controls} />,
  });
  useLayoutEffect(() => {
    panelRef.current = panel;
  });
  return <DataTable {...panel.table} refreshKey={version} />;
}
