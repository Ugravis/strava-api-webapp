"use client";

import { APP_SETTINGS, type AppSettingCategory, type AppSettingKey } from "@kilotrace/shared";
import type { TableQuery } from "@kilotrace/shared/table";
import {
  CalendarClockIcon,
  FolderIcon,
  IdCardIcon,
  type LucideIcon,
  MailIcon,
  PanelRightOpenIcon,
  PinIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  SlidersHorizontalIcon,
  TextIcon,
  ToggleRightIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useMemo, useRef } from "react";
import {
  type DataTableColumn,
  type DataTableConfig,
  DataTable,
  dateColumn,
  editColumn,
  lookColumn,
  RowActions,
  textColumn,
} from "@kilotrace/ui/components/admin/data-table";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  type DetailFieldEdit,
  DetailHeader,
  DetailLoader,
  DetailMedia,
  DetailSection,
  DetailSkeleton,
  type RowPanelControls,
  useRowPanel,
} from "@kilotrace/ui/components/admin/detail";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@kilotrace/ui/components/ui/dropdown-menu";
import type { ActionResult } from "@kilotrace/ui/components/admin/action-state";
import { createVersion } from "@/lib/admin/version";
import { fetchSettingsTable, loadSetting, resetAppSetting, setAppSetting } from "./actions";
import type { SettingRow } from "./settings-types";

const { useVersion: useSettingsVersion, bump: bumpSettings } = createVersion();

const ICONS: Record<AppSettingKey, LucideIcon> = {
  signupsEnabled: UserPlusIcon,
  emailSignInEnabled: MailIcon,
  maxAccounts: UsersIcon,
  profileShowcaseEnabled: IdCardIcon,
  pinnedBadgesMax: PinIcon,
  stravaSyncEnabled: RefreshCwIcon,
};

function iconOf(key: AppSettingKey) {
  const Icon = ICONS[key];
  return <Icon />;
}

const LOCK = "Réservé aux rôles qui modifient les réglages du site";

/** No cap, for a number left empty. */
const UNLIMITED = "Illimité";

/** A value in words: « Activé » / « Désactivé », a number, or « Illimité ». */
function shown(value: boolean | number | null): string {
  if (typeof value === "boolean") return value ? "Activé" : "Désactivé";
  return value === null ? UNLIMITED : value.toLocaleString("fr-FR");
}

const changed = (row: SettingRow) => row.updatedAt !== null && row.value !== row.defaultValue;

/** Saved, then the page read again: the table, its detail and the figures above. */
type Saved = (outcome: Promise<ActionResult>) => Promise<ActionResult>;

function valueEdit(row: SettingRow, canEdit: boolean, saved: Saved): DetailFieldEdit {
  const { rule } = APP_SETTINGS[row.key];
  const locked = canEdit ? undefined : LOCK;
  if (rule.type === "boolean") {
    return {
      kind: "switch",
      value: row.value === true,
      locked,
      confirm: (next) => (next ? row.confirm?.on : row.confirm?.off),
      onSave: (value) => saved(setAppSetting(row.key, value)),
    };
  }
  return {
    kind: "number",
    value: typeof row.value === "number" ? row.value : null,
    ...(rule.type === "number" && { min: rule.min, max: rule.max, required: rule.required, noneLabel: rule.required ? undefined : UNLIMITED }),
    step: 1,
    locked,
    onSave: (value) => saved(setAppSetting(row.key, value)),
  };
}

function settingColumns(canEdit: boolean, saved: Saved): DataTableColumn<SettingRow>[] {
  return [
    lookColumn({ id: "setting", header: "Réglage", icon: <SlidersHorizontalIcon />, sortable: true, value: (row) => ({ icon: iconOf(row.key), name: row.label }) }),
    // The switch alone, in the detail too: its place says on or off.
    { ...editColumn({ id: "value", header: "Valeur", icon: <ToggleRightIcon />, bare: true, edit: (row) => valueEdit(row, canEdit, saved) }), detailCell: undefined },
    dateColumn({ id: "updatedAt", header: "Modifié", icon: <CalendarClockIcon />, sortable: true, relative: true, value: (row) => row.updatedAt }),
    textColumn({ id: "description", header: "Description", icon: <TextIcon />, muted: true, value: (row) => row.description }),
    textColumn({ id: "defaultValue", header: "Par défaut", icon: <RotateCcwIcon />, muted: true, value: (row) => shown(row.defaultValue) }),
    textColumn({ id: "category", header: "Catégorie", icon: <FolderIcon />, value: (row) => row.categoryTitle }),
  ];
}

/** The settings of the site, grouped by category, edited in place or in their detail; every member reads, `canEdit` changes them. */
export function SettingsTable({ canEdit, categories: given }: { canEdit: boolean; categories: Record<AppSettingCategory, string> }) {
  const version = useSettingsVersion();
  // A new object on every render of the page (e.g. after a change of the banner): kept while its texts are the same, so that the table is not fetched again.
  const categoriesKey = JSON.stringify(given);
  const categories = useMemo(() => JSON.parse(categoriesKey) as Record<AppSettingCategory, string>, [categoriesKey]);
  const router = useRouter();
  const panelRef = useRef<RowPanelControls | null>(null);
  const saved = useMemo<Saved>(
    () => async (outcome) => {
      const result = await outcome;
      if (result.ok) {
        bumpSettings();
        router.refresh();
      }
      return result;
    },
    [router],
  );
  const config = useMemo<DataTableConfig<SettingRow>>(
    () => ({
      id: "settings",
      fetch: (query: TableQuery) => fetchSettingsTable(query),
      rowId: (row) => row.key,
      search: "Réglage ou description",
      noun: (total) => (total > 1 ? "réglages" : "réglage"),
      empty: { title: "Aucun réglage", description: "Les réglages du site apparaîtront ici." },
      defaultSort: { id: "setting", desc: false },
      defaultGroupBy: "category",
      groupings: [{ id: "category", label: "Catégorie", title: (key) => categories[key as AppSettingCategory] ?? key }],
      views: [{ id: "table", label: "Table", columns: ["setting", "value", "updatedAt", "description", "defaultValue", "category"], noSelection: true }],
      columns: settingColumns(canEdit, saved),
      actions: (row) => (
        <RowActions label={`Actions de ${row.label}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => panelRef.current?.open(row.key)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
          </DropdownMenuGroup>
          {canEdit && changed(row) && (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => void saved(resetAppSetting(row.key))}>
                  <RotateCcwIcon />
                  Remettre par défaut
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </>
          )}
        </RowActions>
      ),
    }),
    [canEdit, categories, saved],
  );
  const panel = useRowPanel<SettingRow>({
    config,
    title: (row) => row.label,
    load: loadSetting,
    detail: (key) => <SettingPanel settingKey={key} canEdit={canEdit} saved={saved} />,
  });
  useLayoutEffect(() => {
    panelRef.current = panel;
  });
  return <DataTable {...panel.table} refreshKey={version} />;
}

/** A setting loaded by the panel, loaded again after every change. */
function SettingPanel({ settingKey, canEdit, saved }: { settingKey: string; canEdit: boolean; saved: Saved }) {
  const version = useSettingsVersion();
  const columns = useMemo(() => settingColumns(canEdit, saved), [canEdit, saved]);
  return (
    <DetailLoader id={settingKey} load={loadSetting} refreshKey={version} skeleton={<DetailSkeleton media actions={1} sections={[4]} />}>
      {(row) => {
        return (
          <>
            <DetailHeader media={<DetailMedia icon={iconOf(row.key)} />} title={row.label} subtitle={row.categoryTitle} />
            <DetailActions>
              <DetailAction
                label="Remettre par défaut"
                icon={<RotateCcwIcon aria-hidden />}
                locked={canEdit ? null : LOCK}
                disabled={!changed(row)}
                onClick={() => saved(resetAppSetting(row.key))}
              />
            </DetailActions>
            <DetailSection title="Réglage">
              <DetailColumnFields row={row} columns={columns} ids={["value", "updatedAt", "defaultValue", { id: "description", stacked: true }]} />
            </DetailSection>
          </>
        );
      }}
    </DetailLoader>
  );
}
