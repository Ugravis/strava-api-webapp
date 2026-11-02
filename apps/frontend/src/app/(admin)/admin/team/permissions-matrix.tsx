"use client";

import { CrownIcon, KeyRoundIcon, KeySquareIcon, LockIcon, ShapesIcon, ShieldCheckIcon, ShieldIcon, TextIcon } from "lucide-react";
import { createContext, type ReactNode, use, useLayoutEffect, useMemo, useState, useSyncExternalStore, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/components/admin/action-state";
import { customColumn, type DataTableConfig, DataTable, localTableSource, TableCheckbox } from "@/components/admin/data-table";
import { DetailField, DetailFields, DetailHeader, DetailLoader, DetailMedia, DetailSection, DetailSkeleton, useRowPanel } from "@/components/admin/detail";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

/** Stored roles, mirrored here: the admin contracts never reach the browser. */
type EditableRole = "support" | "admin";

export type MatrixGrants = Record<EditableRole, string[]>;

export interface MatrixPermission {
  key: string;
  label: string;
  description: string;
  locked: boolean;
}

export interface MatrixCategory {
  key: string;
  label: string;
  /** Icon of the section, as in the navigation. */
  icon: ReactNode;
  permissions: MatrixPermission[];
}

export interface MatrixLabels {
  permission: string;
  roles: Record<EditableRole | "super-admin", string>;
  locked: string;
  unsaved: string;
  save: string;
  reset: string;
}

const ROLES: readonly EditableRole[] = ["support", "admin"];

/** A permission, a row of the table, in the order of the catalog. */
interface Row extends MatrixPermission {
  category: string;
  rank: number;
}

interface GrantsState {
  grants: MatrixGrants;
  toggle: (role: EditableRole, key: string, checked: boolean) => void;
  disabled: boolean;
  labels: MatrixLabels;
}

/** The grants being edited, read by the cells: the config stays the same while they change. */
const Grants = createContext<GrantsState | null>(null);

/*
 * The same grants for the detail of a permission: drawn in the side panel,
 * outside the tree of the matrix and its context. One matrix per page.
 */
let shared: GrantsState | null = null;
const listeners = new Set<() => void>();
const subscribe = (onChange: () => void) => {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
};
const useSharedGrants = () => useSyncExternalStore(subscribe, () => shared, () => null);

function GrantBox({ row, role }: { row: Row; role: EditableRole | "super-admin" }) {
  const state = use(Grants)!;
  if (role === "super-admin") {
    return <TableCheckbox aria-label={`${row.label}, ${state.labels.roles[role]}`} checked disabled />;
  }
  return (
    <TableCheckbox
      aria-label={`${row.label}, ${state.labels.roles[role]}`}
      checked={state.grants[role].includes(row.key)}
      disabled={state.disabled || row.locked}
      title={row.locked ? state.labels.locked : undefined}
      onCheckedChange={(checked) => state.toggle(role, row.key, checked)}
    />
  );
}

const ROLE_ICONS = { support: <ShieldIcon />, admin: <KeyRoundIcon />, "super-admin": <CrownIcon /> };

/**
 * Permissions of each role, one row per action grouped by category.
 * Super-admins hold everything; the changes wait for Save.
 */
export function PermissionsMatrix({
  categories,
  initial,
  canEdit,
  labels,
  save,
}: {
  categories: MatrixCategory[];
  initial: MatrixGrants;
  canEdit: boolean;
  labels: MatrixLabels;
  save: (grants: MatrixGrants) => Promise<ActionResult>;
}) {
  const [grants, setGrants] = useState(initial);
  const [saving, startSaving] = useTransition();
  const dirty = ROLES.some((role) => !sameSet(grants[role], initial[role]));

  function toggle(role: EditableRole, key: string, checked: boolean) {
    setGrants((previous) => ({
      ...previous,
      [role]: checked ? [...previous[role], key] : previous[role].filter((permission) => permission !== key),
    }));
  }

  function submit() {
    startSaving(async () => {
      const result = await save(grants);
      (result.ok ? toast.success : toast.error)(result.message);
    });
  }

  const state = useMemo<GrantsState>(() => ({ grants, toggle, disabled: !canEdit || saving, labels }), [grants, canEdit, saving, labels]);
  useLayoutEffect(() => {
    shared = state;
    listeners.forEach((listener) => listener());
  }, [state]);

  const ranked = useMemo(
    () => categories.flatMap((category) => category.permissions.map((permission) => ({ ...permission, category: category.key }))).map((row, rank) => ({ ...row, rank })),
    [categories],
  );
  const config = useMemo<DataTableConfig<Row>>(() => {
    const grantColumn = (role: EditableRole | "super-admin") =>
      customColumn<Row>({
        id: role,
        header: labels.roles[role],
        icon: ROLE_ICONS[role],
        className: "w-32 text-center",
        cell: (row) => <GrantBox row={row} role={role} />,
        skeleton: <Skeleton className="inline-block size-4 rounded-sm align-middle" />,
      });
    return {
      id: "permissions",
      fetch: localTableSource(ranked, {
        search: (row) => `${row.label} ${row.description}`,
        sorts: { permission: (row) => row.rank },
        facets: { category: { options: categories.map((category) => category.key), values: (row) => [row.category] } },
        groupings: { category: (row) => String(categories.findIndex((category) => category.key === row.category)).padStart(2, "0") },
      }),
      rowId: (row) => row.key,
      search: "Permission",
      noun: (count) => (count > 1 ? "permissions" : "permission"),
      empty: { title: "Aucune permission", description: "Aucune permission ne correspond." },
      defaultSort: { id: "permission", desc: false },
      defaultGroupBy: "category",
      pageSize: 100,
      maxHeight: "none",
      columns: [
        customColumn<Row>({
          id: "permission",
          header: labels.permission,
          icon: <ShieldCheckIcon />,
          sortable: true,
          locked: true,
          cell: (row) => (
            <span className="flex min-w-0 flex-col">
              <span className="flex items-center gap-1.5 font-medium">
                {row.label}
                {row.locked && <LockIcon className="size-3 text-muted-foreground" aria-label={labels.locked} />}
              </span>
              <span className="text-xs text-muted-foreground">{row.description}</span>
            </span>
          ),
          copy: (row) => row.label,
          skeleton: (
            <span className="flex flex-col gap-1">
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-3 w-56" />
            </span>
          ),
        }),
        ...ROLES.map(grantColumn),
        grantColumn("super-admin"),
      ],
      facets: [{ id: "category", label: "Catégorie", options: categories.map((category) => ({ value: category.key, label: category.label, icon: category.icon })) }],
      groupings: [
        {
          // Keys sent in the order of the catalog: the rank of the category.
          id: "category",
          label: "Catégorie",
          title: (key) => {
            const category = categories[Number(key)];
            return (
              <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
                {category?.icon}
                {category?.label ?? key}
              </span>
            );
          },
        },
      ],
    };
  }, [categories, labels, ranked]);
  // Read on the page: a key not among them belongs to another table.
  const load = useMemo(() => async (key: string) => ranked.find((row) => row.key === key) ?? null, [ranked]);
  const panel = useRowPanel<Row>({
    config,
    title: (row) => row.label,
    load,
    detail: (key) => (
      <DetailLoader id={key} load={load} skeleton={<DetailSkeleton media sections={[4, 3]} />}>
        {(row) => <PermissionDetail row={row} category={categories.find((category) => category.key === row.category)} />}
      </DetailLoader>
    ),
  });

  return (
    <div className="flex flex-col gap-3">
      <Grants value={state}>
        <DataTable {...panel.table} />
      </Grants>

      {canEdit && dirty && (
        <div className="sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-background p-3 shadow-lg">
          <p className="text-sm">{labels.unsaved}</p>
          <div className="flex gap-2">
            <Button variant="ghost" disabled={saving} onClick={() => setGrants(initial)}>
              {labels.reset}
            </Button>
            <Button disabled={saving} onClick={submit}>
              {labels.save}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

/** A permission and the roles granted it: the switches change the grants being edited, saved with the matrix. */
function PermissionDetail({ row, category }: { row: Row; category?: MatrixCategory }) {
  const state = useSharedGrants();
  if (!state) return null;
  const { grants, toggle, disabled, labels } = state;
  const lock = row.locked ? labels.locked : disabled ? "Réservé aux membres qui gèrent les permissions" : null;
  return (
    <>
      <DetailHeader media={<DetailMedia icon={category?.icon ?? <ShieldCheckIcon />} />} title={row.label} subtitle={category?.label} />
      <DetailSection title="Permission">
        <DetailFields>
          <DetailField label={labels.permission} icon={<ShieldCheckIcon />}>
            {row.label}
          </DetailField>
          <DetailField label="Description" icon={<TextIcon />} stacked>
            {row.description}
          </DetailField>
          <DetailField label="Catégorie" icon={<ShapesIcon />} copy={category?.label ?? row.category}>
            <span className="inline-flex items-center gap-1.5 [&_svg]:size-3.5">
              {category?.icon}
              {category?.label ?? row.category}
            </span>
          </DetailField>
          <DetailField label="Clé" icon={<KeySquareIcon />}>
            <code className="font-mono text-xs">{row.key}</code>
          </DetailField>
        </DetailFields>
      </DetailSection>
      <DetailSection title="Rôles">
        <DetailFields>
          {ROLES.map((role) => (
            <DetailField
              key={role}
              label={labels.roles[role]}
              icon={ROLE_ICONS[role]}
              edit={{ kind: "switch", value: grants[role].includes(row.key), locked: lock, onSave: async (checked) => toggle(role, row.key, checked) }}
            />
          ))}
          <DetailField
            label={labels.roles["super-admin"]}
            icon={ROLE_ICONS["super-admin"]}
            edit={{ kind: "switch", value: true, locked: "Les super-admins ont toutes les permissions", onSave: async () => {} }}
          />
        </DetailFields>
        <p className="text-xs text-muted-foreground">Les changements attendent « {labels.save} » sous le tableau.</p>
      </DetailSection>
    </>
  );
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}
