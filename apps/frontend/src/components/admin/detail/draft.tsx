"use client";

import type { FieldRules } from "@kilotrace/shared/rules";
import { CheckIcon, LoaderCircleIcon, LockIcon, PencilIcon, PlusIcon, XIcon } from "lucide-react";
import { type FormEvent, Fragment, type KeyboardEvent, type ReactNode, type RefObject, useEffect, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/components/admin/action-state";
import { useSplitPanelGuard } from "@/components/split-panel";
import { Button } from "@/components/ui/button";
import { useNoHover } from "@/hooks/use-no-hover";
import { cn } from "@/lib/utils";
import { DetailAction, DetailActions } from "./actions";
import { SAVE_BUTTON } from "./field-buttons";
import { Tip } from "@/components/admin/data-table";
import { DetailSection, type DetailSectionPill } from "./section";
import { type DetailDraft, type DetailDraftResult, useDetailDraft } from "./use-detail-draft";

/*
 * A draft: values typed in fields always open and submitted as a whole,
 * a new row (`DetailForm`) or fields of a row bound to each other
 * (`DetailSectionForm`). The fields are those of the detail, bound to the
 * draft by `form.bind`.
 */

/** Why a draft was not submitted, above its buttons. */
function DraftError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  );
}

/** Enter submits it, in a field of one line. */
function DraftFormElement({ formRef, onSubmit, onKeyDown, className, children }: { formRef: RefObject<HTMLFormElement | null>; onSubmit: () => void; onKeyDown?: (event: KeyboardEvent<HTMLFormElement>) => void; className?: string; children: ReactNode }) {
  return (
    <form
      ref={formRef}
      noValidate
      onKeyDown={onKeyDown}
      onSubmit={(event: FormEvent) => {
        event.preventDefault();
        onSubmit();
      }}
      className={className}
    >
      {children}
    </form>
  );
}

/**
 * A new row: the detail drawn by `children(form)`, the fields following
 * `rules` (`@kilotrace/shared/rules`) when given, every field bound by
 * `form.bind` typed at once, nothing saved before « Créer ». The first field
 * focused (not on a phone, where it would open the keyboard). Its buttons
 * stay at the bottom of the panel: « Annuler » (`onCancel`, e.g. closing the
 * panel), « Créer ». Refused, the errors show under their fields, the first
 * one focused; created, `onCreated` is given the answer of `onSubmit`, its
 * message in a toast: e.g. the panel shows the row with `replace`. Leaving it
 * typed but not created asks first.
 */
export function DetailForm<T extends object>({
  initial,
  rules,
  onSubmit,
  onCancel,
  onCreated,
  submitLabel = "Créer",
  children,
}: {
  initial: T;
  rules?: FieldRules<T>;
  onSubmit: (values: T) => Promise<DetailDraftResult>;
  onCancel: () => void;
  onCreated: (result: DetailDraftResult) => void;
  submitLabel?: string;
  children: (form: DetailDraft<T>) => ReactNode;
}) {
  const { form, ref, submit, generation, formError } = useDetailDraft(initial, { rules });
  const noHover = useNoHover();
  useSplitPanelGuard(form.dirty);
  useEffect(() => {
    if (noHover) return;
    ref.current?.querySelector<HTMLElement>("input, textarea, button[aria-haspopup]")?.focus();
  }, [noHover, ref]);

  return (
    <DraftFormElement
      formRef={ref}
      onSubmit={() =>
        void submit(onSubmit).then((created) => {
          if (!created) return;
          if (created.message) toast.success(created.message);
          onCreated(created);
        })
      }
      className="contents"
    >
      <Fragment key={generation}>{children(form)}</Fragment>
      <div className="sticky bottom-0 z-10 mt-auto bg-background/95 supports-backdrop-filter:backdrop-blur">
        {formError && (
          <div className="border-t px-4 pt-3">
            <DraftError message={formError} />
          </div>
        )}
        <DetailActions>
          <DetailAction label="Annuler" icon={<XIcon aria-hidden />} disabled={form.saving} onClick={onCancel} />
          <DetailAction label={submitLabel} icon={<PlusIcon aria-hidden />} variant="save" type="submit" pending={form.saving} />
        </DetailActions>
      </div>
    </DraftFormElement>
  );
}

/**
 * A section whose fields are edited together and saved by one « Valider »:
 * values bound to each other (a start and its end, a choice and what hangs
 * on it). At rest, its fields show their values, without pencil, a pencil
 * on the right of its title opening them all. Editing: « Annuler » or Esc
 * gives up, « Valider » or Enter saves through `onSubmit`, the errors under
 * their fields; leaving the panel meanwhile asks first. A new `initial` (the
 * row loaded again) replaces the values at rest.
 */
export function DetailSectionForm<T extends object>({
  title,
  pill,
  tone,
  initial,
  rules,
  onSubmit,
  editLabel,
  locked,
  children,
}: {
  title: string;
  pill?: DetailSectionPill;
  tone?: "default" | "danger";
  initial: T;
  rules?: FieldRules<T>;
  onSubmit: (values: T) => Promise<ActionResult | void>;
  /** The name of its pencil, « Modifier : <title> » by default. */
  editLabel?: string;
  /** Not for this user, and why: a lock in place of its pencil. */
  locked?: string | null;
  children: (form: DetailDraft<T>) => ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const { form, ref, reset, submit, generation, formError } = useDetailDraft(initial, { active: editing, rules });
  useSplitPanelGuard(editing && form.dirty);
  const cancel = () => {
    reset();
    setEditing(false);
  };

  return (
    <DetailSection
      title={title}
      pill={pill}
      tone={tone}
      className={cn(editing && "bg-muted/40")}
      aside={
        locked ? (
          <Tip label={locked}>
            <span role="img" tabIndex={0} aria-label={locked} className="inline-flex size-7 cursor-not-allowed items-center justify-center text-muted-foreground/70 [&_svg]:size-3.5">
              <LockIcon />
            </span>
          </Tip>
        ) : (
          !editing && <DetailAction label={editLabel ?? `Modifier : ${title}`} icon={<PencilIcon aria-hidden />} onClick={() => setEditing(true)} />
        )
      }
    >
      <DraftFormElement
        formRef={ref}
        onSubmit={() => void submit(onSubmit).then((saved) => saved && setEditing(false))}
        onKeyDown={(event) => {
          // Its own fields only: a popover, rendered elsewhere, handles its Esc itself.
          if (event.key !== "Escape" || !editing || !event.currentTarget.contains(event.target as Node)) return;
          event.preventDefault();
          cancel();
        }}
        className="flex flex-col gap-2"
      >
        <Fragment key={generation}>{children(form)}</Fragment>
        {editing && (
          <>
            <DraftError message={formError} />
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" size="sm" disabled={form.saving} onClick={cancel}>
                <XIcon aria-hidden />
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={form.saving} className={SAVE_BUTTON}>
                {form.saving ? <LoaderCircleIcon className="animate-spin" aria-hidden /> : <CheckIcon aria-hidden />}
                Valider
              </Button>
            </div>
          </>
        )}
      </DraftFormElement>
    </DetailSection>
  );
}
