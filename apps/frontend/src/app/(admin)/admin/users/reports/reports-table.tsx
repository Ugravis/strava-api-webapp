"use client";

import { USER_REPORT_REASONS } from "@kilotrace/shared";
import type { AdminPermission, AdminUserReport, UserReportStatus } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import { BanIcon, CheckCheckIcon, ChevronDownIcon, CopyIcon, ExternalLinkIcon, FlagIcon, FlagOffIcon, GavelIcon, PanelRightOpenIcon, Trash2Icon } from "lucide-react";
import { type ReactNode, useLayoutEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { type DataTableConfig, DataTable, RowActions, useConfirmDialog } from "@kilotrace/ui/components/admin/data-table";
import { type RowPanelControls, useRowPanel } from "@kilotrace/ui/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@kilotrace/ui/components/ui/dropdown-menu";
import { userProfileHref } from "@/config/routes";
import { cn } from "@kilotrace/ui/lib/utils";
import { REFUSALS, type UserActionKey, userActionsOf } from "../user-actions";
import { useOpenUser } from "../use-user-panel";
import { fetchReportsTable, loadReport, loadReportDetail } from "./actions";
import { REPORT_REASONS, REPORT_STATUSES, reportColumns, useReportsVersion } from "./report-bits";
import { closingOf, useSanctionDialog } from "./report-decisions";
import { ReportRowPanel } from "./report-detail";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/** The sanctions offered by the menu of a row, in the order of the buttons of the detail. */
const MENU_ICONS: Partial<Record<UserActionKey, ReactNode>> = { moderate: <GavelIcon />, suspend: <BanIcon />, delete: <Trash2Icon /> };

const MENU_SANCTIONS: { key: "moderate" | "suspend" | "delete"; label: string; destructive?: boolean }[] = [
  { key: "moderate", label: "Modérer" },
  { key: "suspend", label: "Suspendre", destructive: true },
  { key: "delete", label: "Supprimer le compte", destructive: true },
];

/**
 * The section of the reports, folded on arrival when none is open: the
 * table stays mounted, so that a shared link still opens its report.
 */
export function ReportsSection({ title, openCount, permissions }: { title: string; openCount: number; permissions: AdminPermission[] }) {
  const [unfolded, setUnfolded] = useState(openCount > 0);
  return (
    <section id="reports" className="flex scroll-mt-20 flex-col gap-3" aria-labelledby="reports-title">
      <h2 id="reports-title" className="text-sm font-medium">
        <button type="button" className="flex items-center gap-2 rounded-md outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-expanded={unfolded} aria-controls="reports-table" onClick={() => setUnfolded(!unfolded)}>
          <FlagIcon className="size-4 text-muted-foreground" aria-hidden />
          {title}
          {openCount > 0 && <span className="rounded-full bg-destructive px-1.5 text-xs text-white tabular-nums">{openCount}</span>}
          <ChevronDownIcon className={cn("size-4 text-muted-foreground transition-transform", !unfolded && "-rotate-90")} aria-hidden />
        </button>
      </h2>
      <div id="reports-table" hidden={!unfolded}>
        <ReportsTable permissions={permissions} />
      </div>
    </section>
  );
}

/** The reports, those open by default; a click opens one in the side panel. */
export function ReportsTable({ permissions }: { permissions: AdminPermission[] }) {
  const version = useReportsVersion();
  const openUser = useOpenUser();
  const { ask, dialog: confirmDialog } = useConfirmDialog();
  const { openSanction, dialog } = useSanctionDialog();
  // The panel, read by the menus of the rows: the config stays the same as it changes.
  const panelRef = useRef<RowPanelControls | null>(null);
  const canHandle = permissions.includes("reports.handle");
  /** A sanction from the menu: the account loaded first, for its dialog and what the member may do on it. */
  const sanction = async (report: AdminUserReport, key: UserActionKey) => {
    const data = await loadReportDetail(report.id).catch(() => null);
    const target = data?.target;
    if (!target) return toast.error(data ? "Le compte signalé n'existe plus." : "Chargement impossible");
    if (target.refusal) return toast.error(REFUSALS[target.refusal]);
    const action = userActionsOf(target.user, target.permissions, target.refusal).find((each) => each.key === key);
    if (!action) return toast.error("Ce compte est déjà suspendu : utilisez « Marquer sanctionné ».");
    if (action.locked) return toast.error(action.locked);
    openSanction(report.id, target.user, key);
  };
  const config = useMemo<DataTableConfig<AdminUserReport>>(
    () => ({
      id: "reports",
      fetch: (query: TableQuery) => fetchReportsTable(query),
      rowId: (report) => report.id,
      muted: (report) => report.status === "dismissed",
      search: "Pseudo ou précisions",
      noun: (count) => (count > 1 ? "signalements" : "signalement"),
      empty: { title: "Aucun signalement", description: "Les signalements envoyés depuis les profils apparaîtront ici." },
      emptyFiltered: ({ filters, search }) =>
        !search && filters.status?.length === 1 && filters.status[0] === "open" && Object.entries(filters).every(([id, values]) => id === "status" || values.length === 0)
          ? { title: "Aucun signalement ouvert", description: "La modération est à jour." }
          : null,
      defaultSort: { id: "createdAt", desc: true },
      defaultFilters: { status: ["open"] },
      pageSize: 12,
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
          {/* The buttons of the detail, those the member may run. */}
          {report.status === "open" && canHandle && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                {report.target &&
                  MENU_SANCTIONS.filter(({ key }) => permissions.includes(`users.${key}`)).map(({ key, label, destructive }) => (
                    <DropdownMenuItem key={key} variant={destructive ? "destructive" : "default"} onClick={() => void sanction(report, key)}>
                      {MENU_ICONS[key]}
                      {label}
                    </DropdownMenuItem>
                  ))}
                <DropdownMenuItem onClick={() => ask(closingOf(report, "mark").confirm, closingOf(report, "mark").run)}>
                  <CheckCheckIcon />
                  Marquer sanctionné
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => ask(closingOf(report, "dismiss").confirm, closingOf(report, "dismiss").run)}>
                  <FlagOffIcon />
                  Rejeter
                </DropdownMenuItem>
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
      ),
    }),
    // `sanction` reads only stable callbacks.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [openUser, ask, canHandle, permissions],
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
  return (
    <>
      <DataTable {...panel.table} refreshKey={version} />
      {confirmDialog}
      {dialog}
    </>
  );
}
