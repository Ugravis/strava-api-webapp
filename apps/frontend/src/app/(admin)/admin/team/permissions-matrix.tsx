"use client";

import { CrownIcon, KeyRoundIcon, KeySquareIcon, LockIcon, ShapesIcon, ShieldCheckIcon, ShieldIcon, TextIcon } from "lucide-react";
import { type MemoryTableSpec, serveTablePage, type TableQuery } from "@kilotrace/shared/table";
import { type ReactNode, useCallback, useMemo, useRef, useState } from "react";
import type { ActionResult } from "@/components/admin/action-state";
import { customColumn, type DataTableColumn, type DataTableConfig, DataTable, editColumn } from "@/components/admin/data-table";
import { DetailColumnFields, DetailField, DetailFields, DetailHeader, DetailLoader, DetailMedia, DetailSection, DetailSkeleton, useRowPanel } from "@/components/admin/detail";
import { Skeleton } from "@/components/ui/skeleton";
import { createVersion } from "@/lib/admin/version";

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
}

const ROLES: readonly EditableRole[] = ["support", "admin"];

const ROLE_ICONS = { support: <ShieldIcon />, admin: <KeyRoundIcon />, "super-admin": <CrownIcon /> };

const MANAGE_LOCK = "Réservé aux membres qui gèrent les permissions";
const SUPER_ADMIN_LOCK = "Les super-admins ont toutes les permissions";

/** A permission, a row of the table, in the order of the catalog, with the roles granted it. */
interface Row extends MatrixPermission {
  category: string;
  rank: number;
  granted: Record<EditableRole, boolean>;
}

/** The version of the grants: the `refreshKey` of the table and of the detail of a permission. */
const { useVersion: useGrantsVersion, bump: bumpGrants } = createVersion();

/**
 * Permissions of each role, one row per action grouped by category, a row
 * opened in the side panel. Super-admins hold everything; a switch saves at
 * once, in the table as in the detail.
 */
export function PermissionsMatrix({
  categories: given,
  initial,
  canEdit,
  labels: givenLabels,
  save: givenSave,
}: {
  categories: MatrixCategory[];
  initial: MatrixGrants;
  canEdit: boolean;
  labels: MatrixLabels;
  save: (grants: MatrixGrants) => Promise<ActionResult>;
}) {
  const version = useGrantsVersion();
  // The page is drawn again after every save (`refresh`), its props new objects of the same catalog and texts:
  // kept from the first render, so that the config, hence the rows, stay the same.
  const [categories] = useState(given);
  const [labels] = useState(givenLabels);
  const [save] = useState(() => givenSave);
  // The grants saved, read by the switches: one save at a time, each from the last one.
  const grants = useRef(initial);
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const grant = useCallback(
    (role: EditableRole, key: string, checked: boolean): Promise<ActionResult> => {
      const run = queue.current.then(async () => {
        const current = grants.current;
        const next = { ...current, [role]: checked ? [...current[role].filter((each) => each !== key), key] : current[role].filter((each) => each !== key) };
        const result = await save(next);
        if (result.ok) {
          grants.current = next;
          bumpGrants();
        }
        return result;
      });
      queue.current = run.catch(() => {});
      return run;
    },
    [save],
  );

  const columns = useMemo<DataTableColumn<Row>[]>(() => {
    const grantColumn = (role: EditableRole | "super-admin") =>
      editColumn<Row>({
        id: role,
        header: labels.roles[role],
        icon: ROLE_ICONS[role],
        className: "w-36",
        bare: true,
        edit: (row) =>
          role === "super-admin"
            ? { kind: "switch", value: true, locked: SUPER_ADMIN_LOCK, onSave: async () => {} }
            : {
                kind: "switch",
                value: row.granted[role],
                locked: row.locked ? labels.locked : canEdit ? null : MANAGE_LOCK,
                onSave: (checked) => grant(role, row.key, checked),
              },
      });
    return [
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
    ];
  }, [labels, canEdit, grant]);

  const config = useMemo<DataTableConfig<Row>>(() => {
    const spec: MemoryTableSpec<Row> = {
      search: (row) => `${row.label} ${row.description}`,
      sorts: { permission: (row) => row.rank },
      facets: { category: { options: categories.map((category) => category.key), values: (row) => [row.category] } },
      groupings: { category: (row) => String(categories.findIndex((category) => category.key === row.category)).padStart(2, "0") },
    };
    // Read at each fetch: the switches saved show once the version is bumped.
    const fetch = async (query: TableQuery) => serveTablePage(rowsOf(categories, grants.current), spec, query);
    return {
      id: "permissions",
      fetch,
      rowId: (row) => row.key,
      search: "Permission",
      noun: (count) => (count > 1 ? "permissions" : "permission"),
      empty: { title: "Aucune permission", description: "Aucune permission ne correspond." },
      defaultSort: { id: "permission", desc: false },
      defaultGroupBy: "category",
      pageSize: 100,
      maxHeight: "none",
      columns,
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
  }, [categories, columns]);

  // Read on the page: a key not among them belongs to another table.
  const load = useCallback(async (key: string) => rowsOf(categories, grants.current).find((row) => row.key === key) ?? null, [categories]);
  const panel = useRowPanel<Row>({
    config,
    title: (row) => row.label,
    load,
    detail: (key) => <PermissionRowPanel id={key} load={load} columns={columns} categories={categories} labels={labels} />,
  });

  return <DataTable {...panel.table} refreshKey={version} />;
}

/** The rows of the catalog, with the roles granted each. */
function rowsOf(categories: MatrixCategory[], grants: MatrixGrants): Row[] {
  return categories
    .flatMap((category) => category.permissions.map((permission) => ({ ...permission, category: category.key })))
    .map((row, rank) => ({ ...row, rank, granted: { support: grants.support.includes(row.key), admin: grants.admin.includes(row.key) } }));
}

/** A permission loaded by the panel; loaded again after every switch saved. */
function PermissionRowPanel({
  id,
  load,
  columns,
  categories,
  labels,
}: {
  id: string;
  load: (key: string) => Promise<Row | null>;
  columns: DataTableColumn<Row>[];
  categories: MatrixCategory[];
  labels: MatrixLabels;
}) {
  const version = useGrantsVersion();
  return (
    <DetailLoader id={id} load={load} refreshKey={version} skeleton={<DetailSkeleton media sections={[3, 3]} />}>
      {(row) => {
        const category = categories.find((each) => each.key === row.category);
        return (
          <>
            <DetailHeader media={<DetailMedia icon={category?.icon ?? <ShieldCheckIcon />} />} title={row.label} subtitle={category?.label} />
            <DetailSection title="Permission">
              <DetailFields>
                <DetailField label={labels.permission} icon={<ShieldCheckIcon />} copy={row.label}>
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
              <DetailColumnFields row={row} columns={columns} ids={[...ROLES, "super-admin"]} />
            </DetailSection>
          </>
        );
      }}
    </DetailLoader>
  );
}
