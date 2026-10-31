"use client";

import { CheckIcon, LoaderCircleIcon, PencilIcon, SearchXIcon, TriangleAlertIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/components/admin/action-state";
import {
  type CellImage,
  CopyButton,
  type DataTableColumn,
  drawCell,
  EmptyValue,
  FLOATING_BUTTON,
  formatDateTime,
  formatRelative,
  ImageCover,
} from "@/components/admin/data-table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

/*
 * The content of a detail: in the split panel, a dialog or a page alike.
 * Values are drawn by the cells of the table kit, so that a field looks the
 * same in the list and in its detail.
 */

/**
 * A large image across the top of the detail, above its header; a click opens
 * it whole. A grey band without an image: a detail that has a cover has one
 * for every row. Small, an image is a field: an `imageColumn` in
 * `DetailColumnFields`.
 */
export function DetailCover({ image }: { image: CellImage | null | undefined }) {
  return <ImageCover image={image} className="h-40 rounded-none" />;
}

/** Who or what the detail is about: a picture, a name, what tells it apart, and its buttons. */
export function DetailHeader({
  media,
  title,
  subtitle,
  marks,
  actions,
}: {
  /** An avatar, a cover, an icon. */
  media?: ReactNode;
  title: ReactNode;
  subtitle?: ReactNode;
  /** Beside the title: a role, a suspended mark. */
  marks?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start gap-3 p-4">
      {media && <div className="shrink-0">{media}</div>}
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <h2 className="flex min-w-0 items-center gap-2 text-lg font-semibold">
          <span className="truncate">{title}</span>
          {marks}
        </h2>
        {subtitle && <p className="truncate text-sm text-muted-foreground">{subtitle}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-1">{actions}</div>}
    </header>
  );
}

const TONES = {
  default: "",
  danger: "bg-destructive/5",
  warning: "border-l-4 border-l-amber-400 bg-amber-500/5",
};

/** A part of the detail under a small title; `aside` on its right, e.g. a button. Stacked with a line between. */
export function DetailSection({
  title,
  aside,
  tone = "default",
  className,
  children,
}: {
  title?: ReactNode;
  aside?: ReactNode;
  tone?: keyof typeof TONES;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section className={cn("flex flex-col gap-2 border-t p-4 first:border-t-0", TONES[tone], className)}>
      {(title || aside) && (
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          {title && <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>}
          {aside}
        </div>
      )}
      {children}
    </section>
  );
}

/** Labels and values side by side; labels of one width, so that several lists of a section line up. */
export function DetailFields({ children }: { children: ReactNode }) {
  return <dl className="grid grid-cols-[8rem_minmax(0,1fr)] gap-x-4 text-sm">{children}</dl>;
}

/** What a field edits in place; see `DetailField`. */
export interface DetailFieldEdit {
  value: string | null;
  /** Resolves once saved; `{ ok: false }` keeps the field open, its message in a toast. */
  onSave: (value: string | null) => Promise<ActionResult | void>;
  /** On several lines: ⌘ Enter saves. */
  multiline?: boolean;
  placeholder?: string;
}

/**
 * A button floating at the right of a field on hover, beside copy and edit,
 * named in a bubble: the `tools` of a `DetailField`.
 */
export function DetailFieldButton({ label, disabled, onClick, children }: { label: string; disabled?: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger
        delay={400}
        render={
          <button
            type="button"
            aria-label={label}
            disabled={disabled}
            // Pressed before a field being edited loses its focus, which would save.
            onMouseDown={(event) => event.preventDefault()}
            onClick={onClick}
            className={FLOATING_BUTTON}
          >
            {children}
          </button>
        }
      />
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

/**
 * A label and its value, « — » when it has none. On hover, buttons float at
 * the right of the value, in the look of the copy button of the tables:
 * `tools` (any `DetailFieldButton`), copy (`copy`), edit (`edit`). `stacked`
 * sets the value under its label across the whole width, a long text, the
 * buttons then at the top right of the panel. The value may be `DetailItems`,
 * one line per value.
 *
 * `edit` edits it in place: a click on the value, or the pencil, opens a
 * field; Enter (⌘ Enter on several lines), ✓ or leaving the field saves; Esc
 * or ✕ gives up, the panel staying open. Nothing is ever left unsaved, so
 * nothing guards the closing of the panel. Without children, the value shows
 * `edit.value`.
 */
export function DetailField({
  label,
  icon,
  copy,
  stacked,
  tools,
  edit,
  children,
}: {
  label: string;
  icon?: ReactNode;
  copy?: string | null;
  stacked?: boolean;
  tools?: ReactNode;
  edit?: DetailFieldEdit;
  children?: ReactNode;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const editing = !!edit && draft !== null;
  const multiline = !!edit?.multiline;
  const value = children ?? (edit ? edit.value : undefined);
  const empty = value === null || value === undefined || value === "" || value === false;
  const start = () => edit && setDraft(edit.value ?? "");

  const save = async () => {
    if (!edit || draft === null || saving) return;
    const next = draft.trim() || null;
    if (next === edit.value) return setDraft(null);
    setSaving(true);
    try {
      const outcome = await edit.onSave(next);
      if (outcome && !outcome.ok) toast.error(outcome.message);
      else setDraft(null);
    } catch {
      toast.error("La modification n'a pas pu être enregistrée.");
    } finally {
      setSaving(false);
    }
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    if (event.key === "Escape") {
      // Left to the field: the panel stays open.
      event.preventDefault();
      setDraft(null);
    } else if (event.key === "Enter" && (!multiline || event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      void save();
    }
  };

  const buttons = editing ? (
    <>
      <DetailFieldButton label="Enregistrer" disabled={saving} onClick={() => void save()}>
        {saving ? <LoaderCircleIcon className="animate-spin" /> : <CheckIcon />}
      </DetailFieldButton>
      <DetailFieldButton label="Annuler" disabled={saving} onClick={() => setDraft(null)}>
        <XIcon />
      </DetailFieldButton>
    </>
  ) : (
    (tools || copy || edit) && (
      <>
        {tools}
        {copy && <CopyButton value={copy} inline />}
        {edit && (
          <DetailFieldButton label={`Modifier : ${label}`} onClick={start}>
            <PencilIcon />
          </DetailFieldButton>
        )}
      </>
    )
  );
  const field = {
    autoFocus: true,
    value: draft ?? "",
    disabled: saving,
    placeholder: edit?.placeholder,
    "aria-label": label,
    onChange: (event: { target: { value: string } }) => setDraft(event.target.value),
    onKeyDown,
    onBlur: () => void save(),
  };

  return (
    <div className="contents">
      <dt className={cn("flex min-h-8 items-center gap-1.5 self-start text-muted-foreground", stacked && "col-span-2")}>
        {icon && <span className="inline-flex shrink-0 text-muted-foreground/70 [&_svg]:size-3.5">{icon}</span>}
        {label}
      </dt>
      <dd
        className={cn(
          "group/cell relative flex min-h-8 min-w-0 items-center",
          // Its text wraps, cut nowhere.
          stacked && "col-span-2 mb-2 [&_.truncate]:whitespace-normal",
        )}
      >
        {editing ? (
          multiline ? (
            <Textarea {...field} className="min-h-20 pr-16 text-sm" />
          ) : (
            <Input {...field} className="h-7 pr-16 text-sm" />
          )
        ) : (
          // As wide as the panel: the widths of the table columns let go.
          <div
            onClick={edit && start}
            className={cn(
              "min-w-0 flex-1 break-words [&_[class*='max-w-']]:max-w-full",
              edit && "cursor-text",
              edit && !children && (multiline ? "whitespace-pre-line" : "truncate"),
            )}
          >
            {empty ? <EmptyValue /> : value}
          </div>
        )}
        {buttons && (
          <span
            className={cn(
              "absolute right-1.5 z-10 flex items-center gap-1",
              // At the top of a long text or a field of several lines, else centred.
              stacked || editing && multiline ? "top-1" : "top-1/2 -translate-y-1/2",
              !editing && "opacity-0 transition-opacity group-hover/cell:opacity-100 has-focus-visible:opacity-100",
            )}
          >
            {buttons}
          </span>
        )}
      </dd>
    </div>
  );
}

/**
 * The fields of a row as its table draws them: the name, icon, cell and copy
 * of each column, in the order of `ids`. Columns of no value in a detail (the
 * order handle, buttons) are left to the caller not to name.
 */
export function DetailColumnFields<T>({ row, columns, ids }: { row: T; columns: DataTableColumn<T>[]; ids: (string | { id: string; stacked?: boolean })[] }) {
  const byId = new Map(columns.map((column) => [column.id, column]));
  return (
    <DetailFields>
      {ids.map((each) => {
        const { id, stacked } = typeof each === "string" ? { id: each, stacked: false } : each;
        const column = byId.get(id);
        if (!column) return null;
        return (
          <DetailField key={id} label={column.header} icon={column.icon} copy={column.copy?.(row)} stacked={stacked}>
            {drawCell(column, row)}
          </DetailField>
        );
      })}
    </DetailFields>
  );
}

/** Several values of one field, one per line: in a `DetailField`, or alone in a section. */
export function DetailItems({ children }: { children: ReactNode }) {
  return <ul className="flex w-full min-w-0 flex-col">{children}</ul>;
}

/** A value of `DetailItems`: an icon or a picture, its text, and its buttons on the right. */
export function DetailItem({ icon, actions, children }: { icon?: ReactNode; actions?: ReactNode; children: ReactNode }) {
  return (
    <li className="flex min-h-8 min-w-0 items-center gap-2">
      {icon && <span className="inline-flex shrink-0 [&_svg]:size-4">{icon}</span>}
      <span className="min-w-0 flex-1 truncate">{children}</span>
      {actions && <span className="flex shrink-0 items-center gap-0.5">{actions}</span>}
    </li>
  );
}

/**
 * A row of buttons, wrapping on narrow panels, a line above it: under the
 * header, or between sections. `sticky` keeps it at the bottom of the panel
 * as the detail scrolls.
 */
export function DetailActions({ sticky, children }: { sticky?: boolean; children: ReactNode }) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-2 px-4",
        "border-t py-3",
        sticky && "sticky bottom-0 z-10 mt-auto bg-background/95 supports-backdrop-filter:backdrop-blur",
      )}
    >
      {children}
    </div>
  );
}

/** While the detail loads: a header and `fields` lines. */
export function DetailSkeleton({ fields = 6, media = true }: { fields?: number; media?: boolean }) {
  return (
    <div className="flex flex-col gap-4 p-4" aria-busy>
      <div className="flex items-center gap-3">
        {media && <Skeleton className="size-12 rounded-full" />}
        <div className="flex flex-1 flex-col gap-2">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-24" />
        </div>
      </div>
      <div className="flex flex-col gap-3">
        {Array.from({ length: fields }, (_, index) => (
          <div key={index} className="flex gap-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className={cn("h-4", index % 2 ? "w-32" : "w-44")} />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Nothing to show: the row is gone, or the call failed. */
export function DetailEmpty({ icon, title, description, action }: { icon?: ReactNode; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
      {icon && <span className="flex size-10 items-center justify-center rounded-full bg-muted [&_svg]:size-5">{icon}</span>}
      <p className="font-medium">{title}</p>
      {description && <p className="max-w-xs text-sm text-muted-foreground">{description}</p>}
      {action}
    </div>
  );
}

/**
 * Loads the detail of `id`, then draws it: the skeleton meanwhile, an empty
 * state when the row is gone, a retry when the call fails. Back to the
 * skeleton for another id; a new `refreshKey` loads again in the background,
 * the detail shown until the answer, e.g. once its row changed in the table.
 */
export function DetailLoader<T>({
  id,
  load,
  refreshKey,
  skeleton = <DetailSkeleton />,
  children,
}: {
  id: string;
  load: (id: string) => Promise<T | null>;
  refreshKey?: unknown;
  skeleton?: ReactNode;
  children: (row: T) => ReactNode;
}) {
  const [answer, setAnswer] = useState<{ id: string; row?: T | null; error?: true } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const run = useEffectEvent((asked: string) => load(asked));
  useEffect(() => {
    let live = true;
    run(id).then(
      (row) => live && setAnswer({ id, row }),
      () => live && setAnswer({ id, error: true }),
    );
    return () => {
      live = false;
    };
  }, [id, refreshKey, attempt]);

  if (answer?.id !== id) return skeleton;
  if (answer.error) {
    return (
      <DetailEmpty
        icon={<TriangleAlertIcon className="text-destructive" />}
        title="Chargement impossible"
        description="L'API n'a pas répondu. Réessaie dans un instant."
        action={
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              setAnswer(null);
              setAttempt((count) => count + 1);
            }}
          >
            Réessayer
          </Button>
        }
      />
    );
  }
  if (!answer.row) return <DetailEmpty icon={<SearchXIcon />} title="Introuvable" description="Cette ligne n'existe plus, ou le lien est erroné." />;
  return children(answer.row);
}

const TIMELINE_TONES = {
  default: "text-muted-foreground",
  green: "border-green-500/40 text-green-600 dark:text-green-400",
  red: "border-destructive/40 text-destructive",
  amber: "border-amber-500/40 text-amber-600 dark:text-amber-400",
  blue: "border-blue-500/40 text-blue-600 dark:text-blue-400",
};

/** Dated events, the latest first, along a line. */
export function DetailTimeline({ children }: { children: ReactNode }) {
  return <ol className="relative flex flex-col gap-4 before:absolute before:inset-y-2 before:left-3 before:w-px before:-translate-x-1/2 before:bg-border">{children}</ol>;
}

/** An event of `DetailTimeline`: its icon on the line, a title, when (relative, exact on hover), and details. */
export function DetailTimelineItem({
  icon,
  tone = "default",
  title,
  date,
  now,
  children,
}: {
  icon: ReactNode;
  tone?: keyof typeof TIMELINE_TONES;
  title: ReactNode;
  /** ISO. */
  date: string;
  /** Fixed in demos, so that relative dates do not drift. */
  now?: number;
  children?: ReactNode;
}) {
  return (
    <li className="relative flex gap-3">
      <span className={cn("z-10 flex size-6 shrink-0 items-center justify-center rounded-full border bg-background [&_svg]:size-3.5", TIMELINE_TONES[tone])}>{icon}</span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 pt-0.5">
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 text-sm font-medium">{title}</p>
          <time dateTime={date} title={formatDateTime(date)} className="shrink-0 text-xs text-muted-foreground">
            {formatRelative(date, now)}
          </time>
        </div>
        {children && <div className="text-sm text-muted-foreground">{children}</div>}
      </div>
    </li>
  );
}
