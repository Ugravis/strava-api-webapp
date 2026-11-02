"use client";

import { LoaderCircleIcon } from "lucide-react";
import { type ReactNode, useCallback, useEffect, useEffectEvent, useState } from "react";
import { toast } from "sonner";
import type { ActionResult } from "@/components/admin/action-state";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSelectionIconsOnly } from "./parts";
import { Tip } from "./tip";

/** What a button asks before it acts, e.g. a removal. */
export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  /** Its button, e.g. « Supprimer ». */
  confirmLabel: string;
  /** Red, by default: what asks first is mostly what cannot be undone. */
  destructive?: boolean;
  /**
   * A reason typed in the dialog, handed to the action, e.g. of a suspension:
   * `minLength` / `maxLength` its bounds (the button waits for them), `presets`
   * reasons picked in one click.
   */
  reason?: { label: string; placeholder?: string; required?: boolean; minLength?: number; maxLength?: number; presets?: string[] };
  /** A word typed again before the button acts, e.g. the id of a row removed for good. */
  typed?: { label: string; expected: string };
}

/** An action, given the reason typed: an `ActionResult` answered `{ ok: false }` keeps the dialog open, its message in it; any other answer closes it. */
export type ConfirmedRun = (reason: string | undefined) => unknown;

const refused = (outcome: unknown): outcome is ActionResult => !!outcome && typeof outcome === "object" && "ok" in outcome && outcome.ok === false;

/**
 * An action asking first when `confirm` is given: `trigger` opens the
 * dialog, its button then runs `run` (given the reason typed), a spinner
 * meanwhile; `{ ok: false }` or a throw keeps it open with the message, else
 * it closes. Without `confirm`, `trigger` runs at once. `pending` while it runs.
 */
export function useConfirmedAction(run: ConfirmedRun | undefined, confirm: ConfirmOptions | undefined) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [reason, setReason] = useState("");
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const tell = (message: string) => (confirm ? setError(message) : toast.error(message));
  const go = async (typed?: string) => {
    if (!run || pending) return;
    setPending(true);
    setError(null);
    try {
      const outcome = await run(typed);
      // Without a dialog, told in a toast.
      if (refused(outcome)) tell(outcome.message);
      else setOpen(false);
    } catch {
      tell("L'action a échoué. Réessayer.");
    } finally {
      setPending(false);
    }
  };
  const trigger = () => {
    if (!confirm) return void go();
    setReason("");
    setTyped("");
    setError(null);
    setOpen(true);
  };
  const asked = confirm?.reason;
  const length = reason.trim().length;
  const missing =
    (!!asked?.required && length === 0) ||
    (length > 0 && length < (asked?.minLength ?? 0)) ||
    (!!confirm?.typed && typed.trim() !== confirm.typed.expected);

  const dialog = confirm && (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          {confirm.description && <AlertDialogDescription>{confirm.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {asked && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-reason">
              {asked.label}
              {asked.required && <span className="text-destructive">*</span>}
            </Label>
            {asked.presets && asked.presets.length > 0 && (
              <div className="flex flex-wrap gap-1.5" role="group" aria-label="Raisons fréquentes">
                {asked.presets.map((preset) => (
                  <Button key={preset} type="button" size="xs" variant={reason === preset ? "secondary" : "outline"} disabled={pending} onClick={() => setReason(preset)}>
                    {preset}
                  </Button>
                ))}
              </div>
            )}
            <Textarea
              id="confirm-reason"
              autoFocus
              value={reason}
              disabled={pending}
              maxLength={asked.maxLength}
              onChange={(event) => setReason(event.target.value)}
              placeholder={asked.placeholder}
              className="min-h-20 text-sm"
            />
            {asked.minLength !== undefined && asked.maxLength !== undefined && (
              <p className="text-xs text-muted-foreground">
                Entre {asked.minLength} et {asked.maxLength} caractères.
              </p>
            )}
          </div>
        )}
        {confirm.typed && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-typed">{confirm.typed.label}</Label>
            <Input id="confirm-typed" value={typed} disabled={pending} autoComplete="off" spellCheck={false} onChange={(event) => setTyped(event.target.value)} className="text-sm" />
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <Button variant={confirm.destructive === false ? "default" : "destructive"} disabled={pending || missing} onClick={() => void go(asked ? reason.trim() : undefined)}>
            {pending && <LoaderCircleIcon className="animate-spin" aria-hidden />}
            {confirm.confirmLabel}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { trigger, pending, dialog };
}

/**
 * Asks first from anywhere, e.g. an item of the menu of a row, which is gone
 * once the menu closes: `ask(confirm, run)` opens the dialog of
 * `useConfirmedAction`, `dialog` drawn once by the page. `ask` is stable.
 */
export function useConfirmDialog() {
  const [request, setRequest] = useState<{ confirm: ConfirmOptions; run: ConfirmedRun } | null>(null);
  const { trigger, dialog } = useConfirmedAction(request?.run, request?.confirm);
  const opened = useEffectEvent(() => trigger());
  // Kept once closed, so that the texts stay while the dialog fades out.
  useEffect(() => {
    if (request) opened();
  }, [request]);
  const ask = useCallback((confirm: ConfirmOptions, run: ConfirmedRun) => setRequest({ confirm, run }), []);
  return { ask, dialog };
}

/**
 * A button of the bar of a selection (`bulkActions`): its icon and name (its
 * icon alone, named in a bubble, when the bar is too narrow), red when `destructive`, asking first with `confirm` (e.g. « Supprimer 12
 * badges ? »), a spinner while `onClick` runs.
 */
export function SelectionAction({
  label,
  icon,
  destructive,
  confirm,
  onClick,
}: {
  label: string;
  icon: ReactNode;
  destructive?: boolean;
  confirm?: ConfirmOptions;
  onClick: ConfirmedRun;
}) {
  const { trigger, pending, dialog } = useConfirmedAction(onClick, confirm);
  const iconOnly = useSelectionIconsOnly();
  const button = (
    <Button
      size={iconOnly ? "icon-sm" : "sm"}
      variant="ghost"
      disabled={pending}
      onClick={trigger}
      aria-label={iconOnly ? label : undefined}
      className={cn("shrink-0", destructive && "text-destructive hover:text-destructive")}
    >
      {pending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : icon}
      {!iconOnly && label}
    </Button>
  );
  return (
    <>
      {iconOnly ? <Tip label={label}>{button}</Tip> : button}
      {dialog}
    </>
  );
}
