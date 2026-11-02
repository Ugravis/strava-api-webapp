"use client";

import type { FieldRules } from "@kilotrace/shared/rules";
import { ArrowLeftIcon, ChevronRightIcon, LoaderCircleIcon, LockIcon, PencilIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/components/admin/action-state";
import type { DataTableColumn } from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import { type DetailDraftSpec, useDetailDraft } from "./draft";
import { DetailField, DetailFields } from "./field";
import { SAVE_BUTTON } from "./field-buttons";
import type { DetailEditKind } from "./field-edit";

/** A list changed on several rows: its values replaced, or some added to or removed from each. */
export type BulkEditMode = "replace" | "add" | "remove";

/** A field the selection may change: the column `id` (its name and icon), edited as `edit`. */
export interface BulkEditField {
  id: string;
  edit: { [E in DetailEditKind]: DetailDraftSpec<{ value: unknown }, E> }[DetailEditKind];
}

export interface BulkEditChange {
  field: string;
  value: unknown;
  mode: BulkEditMode;
}

const LISTS = new Set<DetailEditKind>(["multiselect", "tags"]);
const blank = (kind: DetailEditKind) => (kind === "switch" ? false : LISTS.has(kind) ? [] : null);

/**
 * « Modifier » in the bar of a selection: a dialog picking one of `fields`,
 * then its value, typed as in a draft (its errors under it, `rules` of the
 * row followed), applied to every row selected by « Appliquer à N … ». A
 * list (`multiselect`, `tags`) is replaced, or its values added to or
 * removed from each row. The selection stays, so that another field may
 * follow; its message in a toast. `onSave` answers `{ ok: false }` to keep
 * the dialog open, its message in it.
 */
export function BulkEditAction<T>({
  count,
  noun,
  columns,
  fields,
  rules,
  onSave,
}: {
  count: number;
  /** The rows, e.g. `badges`, as the `noun` of the table. */
  noun: (count: number) => string;
  columns: DataTableColumn<T>[];
  fields: BulkEditField[];
  rules?: FieldRules<Record<string, unknown>>;
  onSave: (change: BulkEditChange) => Promise<ActionResult>;
}) {
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<BulkEditField | null>(null);
  const rows = `${count.toLocaleString("fr-FR")} ${noun(count)}`;
  const columnOf = (id: string) => columns.find((column) => column.id === id);

  return (
    <>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => {
          setPicked(fields.length === 1 && !fields[0]!.edit.locked ? fields[0]! : null);
          setOpen(true);
        }}
      >
        <PencilIcon data-icon="inline-start" />
        Modifier
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="gap-4 sm:max-w-md">
          {picked ? (
            <BulkValue
              // A field picked again starts blank.
              key={picked.id}
              field={picked}
              label={columnOf(picked.id)?.header ?? picked.id}
              icon={columnOf(picked.id)?.icon}
              rows={rows}
              rule={rules?.[picked.id]}
              onBack={fields.length > 1 ? () => setPicked(null) : undefined}
              onCancel={() => setOpen(false)}
              onSave={async (change) => {
                const outcome = await onSave(change);
                if (outcome.ok) {
                  toast.success(outcome.message);
                  setOpen(false);
                }
                return outcome;
              }}
            />
          ) : (
            <>
              <DialogHeader>
                <DialogTitle>Modifier {rows}</DialogTitle>
                <DialogDescription>Le champ à modifier sur chacun.</DialogDescription>
              </DialogHeader>
              <div className="-mx-2 flex flex-col">
                {fields.map((field) => {
                  const column = columnOf(field.id);
                  // Not for this user: told why, not picked.
                  const locked = field.edit.locked;
                  return (
                    <button
                      key={field.id}
                      type="button"
                      disabled={!!locked}
                      onClick={() => setPicked(field)}
                      className="flex min-h-10 items-center gap-2.5 rounded-md px-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:cursor-not-allowed disabled:hover:bg-transparent [&_svg]:size-4 [&_svg]:shrink-0"
                    >
                      <span className="text-muted-foreground">{column?.icon}</span>
                      <span className={cn("flex-1", locked && "text-muted-foreground")}>{column?.header ?? field.id}</span>
                      {locked ? (
                        <span className="flex items-center gap-1 text-xs text-muted-foreground [&_svg]:size-3.5">
                          <LockIcon aria-hidden />
                          {locked}
                        </span>
                      ) : (
                        <ChevronRightIcon className="text-muted-foreground" aria-hidden />
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

const SAYS: Record<BulkEditMode, (rows: string) => string> = {
  replace: (rows) => `Remplace la valeur de ce champ sur les ${rows}.`,
  add: (rows) => `Ajoute ces valeurs aux ${rows}, en gardant les leurs.`,
  remove: (rows) => `Retire ces valeurs des ${rows}, en gardant les autres.`,
};

/** The value of the field picked, typed as in a draft, and how a list changes. */
function BulkValue({
  field,
  label,
  icon,
  rows,
  rule,
  onBack,
  onCancel,
  onSave,
}: {
  field: BulkEditField;
  label: string;
  icon: ReactNode;
  rows: string;
  rule?: FieldRules<Record<string, unknown>>[string];
  onBack?: () => void;
  onCancel: () => void;
  onSave: (change: BulkEditChange) => Promise<ActionResult>;
}) {
  const list = LISTS.has(field.edit.kind);
  const [mode, setMode] = useState<BulkEditMode>("replace");
  const { form, ref, submit, formError } = useDetailDraft({ value: blank(field.edit.kind) }, { rules: rule ? { value: rule } : undefined });
  // Adding or removing nothing does nothing.
  const edit = form.bind("value", { ...field.edit, required: field.edit.required ?? mode !== "replace" } as DetailDraftSpec<{ value: unknown }, DetailEditKind>);

  return (
    <form
      ref={ref}
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        void submit((values) => onSave({ field: field.id, value: values.value, mode }));
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          {onBack && (
            <Button type="button" size="icon-sm" variant="ghost" className="-ml-1.5" onClick={onBack} aria-label="Choisir un autre champ">
              <ArrowLeftIcon />
            </Button>
          )}
          Modifier {rows}
        </DialogTitle>
        <DialogDescription>{SAYS[mode](rows)}</DialogDescription>
      </DialogHeader>
      {list && (
        <ToggleGroup variant="outline" size="sm" value={[mode]} onValueChange={(next) => next[0] && setMode(next[0] as BulkEditMode)} aria-label="Changement de la liste" className="w-full">
          <ToggleGroupItem value="replace" className="flex-1">
            Remplacer
          </ToggleGroupItem>
          <ToggleGroupItem value="add" className="flex-1">
            Ajouter
          </ToggleGroupItem>
          <ToggleGroupItem value="remove" className="flex-1">
            Retirer
          </ToggleGroupItem>
        </ToggleGroup>
      )}
      <DetailFields>
        <DetailField label={label} icon={icon} edit={edit} />
      </DetailFields>
      {formError && (
        <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {formError}
        </p>
      )}
      <DialogFooter>
        <Button type="button" variant="outline" disabled={form.saving} onClick={onCancel}>
          Annuler
        </Button>
        <Button type="submit" disabled={form.saving} className={SAVE_BUTTON}>
          {form.saving && <LoaderCircleIcon className="animate-spin" aria-hidden />}
          Appliquer à {rows}
        </Button>
      </DialogFooter>
    </form>
  );
}
