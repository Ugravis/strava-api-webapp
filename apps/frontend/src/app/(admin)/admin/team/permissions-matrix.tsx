"use client";

import { LockIcon } from "lucide-react";
import { type ReactNode, useState, useTransition } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/components/admin/action-state";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";

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

const cell = "px-3 py-2";
const ROLES: readonly EditableRole[] = ["support", "admin"];

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

  return (
    <div className="flex flex-col gap-3">
      {/* Every column stays, the table scrolling sideways on narrow screens. */}
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[36rem] text-sm">
          <thead className="bg-muted text-xs text-muted-foreground">
            <tr>
              <th className={`${cell} text-left font-medium`}>{labels.permission}</th>
              {ROLES.map((role) => (
                <th key={role} className={`${cell} w-24 text-center font-medium`}>
                  {labels.roles[role]}
                </th>
              ))}
              <th className={`${cell} w-24 text-center font-medium`}>{labels.roles["super-admin"]}</th>
            </tr>
          </thead>
          {categories.map((category) => (
            <tbody key={category.key}>
              <tr className="border-t bg-muted/50">
                <th colSpan={4} scope="colgroup" className={`${cell} text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground`}>
                  <span className="flex items-center gap-2 [&_svg]:size-3.5">
                    {category.icon}
                    {category.label}
                  </span>
                </th>
              </tr>
              {category.permissions.map((permission) => (
                <tr key={permission.key} className="border-t">
                  <td className={cell}>
                    <p className="flex items-center gap-1.5 font-medium">
                      {permission.label}
                      {permission.locked && <LockIcon className="size-3 text-muted-foreground" aria-label={labels.locked} />}
                    </p>
                    <p className="text-xs text-muted-foreground">{permission.description}</p>
                  </td>
                  {ROLES.map((role) => (
                    <td key={role} className={`${cell} text-center`}>
                      <Checkbox
                        className="mx-auto"
                        aria-label={`${permission.label}, ${labels.roles[role]}`}
                        checked={grants[role].includes(permission.key)}
                        disabled={!canEdit || permission.locked || saving}
                        title={permission.locked ? labels.locked : undefined}
                        onCheckedChange={(checked) => toggle(role, permission.key, checked)}
                      />
                    </td>
                  ))}
                  <td className={`${cell} text-center`}>
                    <Checkbox className="mx-auto" aria-label={`${permission.label}, ${labels.roles["super-admin"]}`} checked disabled />
                  </td>
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>

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
