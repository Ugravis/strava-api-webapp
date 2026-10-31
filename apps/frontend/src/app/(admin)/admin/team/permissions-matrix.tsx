"use client";

import { CrownIcon, KeyRoundIcon, LockIcon, ShieldCheckIcon, ShieldIcon } from "lucide-react";
import { createContext, type ReactNode, use, useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/components/admin/action-state";
import { customColumn, type DataTableConfig, DataTable, localTableSource, TableCheckbox } from "@/components/admin/data-table";
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

/** The grants being edited, read by the cells: the config stays the same while they change. */
const Grants = createContext<{
  grants: MatrixGrants;
  toggle: (role: EditableRole, key: string, checked: boolean) => void;
  disabled: boolean;
  labels: MatrixLabels;
} | null>(null);

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

  const config = useMemo<DataTableConfig<Row>>(() => {
    const rows = categories.flatMap((category) => category.permissions.map((permission) => ({ ...permission, category: category.key })));
    const ranked = rows.map((row, rank) => ({ ...row, rank }));
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
  }, [categories, labels]);

  return (
    <div className="flex flex-col gap-3">
      <Grants value={{ grants, toggle, disabled: !canEdit || saving, labels }}>
        <DataTable config={config} />
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

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  return a.length === b.length && a.every((value) => b.includes(value));
}
