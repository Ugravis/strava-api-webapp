"use client";

import { LoaderCircleIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
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
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

/** What a button asks before it acts, e.g. a removal. */
export interface ConfirmOptions {
  title: string;
  description?: ReactNode;
  /** Its button, e.g. « Supprimer ». */
  confirmLabel: string;
  /** Red, by default: what asks first is mostly what cannot be undone. */
  destructive?: boolean;
  /** A reason typed in the dialog, handed to the action, e.g. of a suspension. */
  reason?: { label: string; placeholder?: string; required?: boolean };
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
    setError(null);
    setOpen(true);
  };
  const missing = !!confirm?.reason?.required && !reason.trim();

  const dialog = confirm && (
    <AlertDialog open={open} onOpenChange={(next) => !pending && setOpen(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{confirm.title}</AlertDialogTitle>
          {confirm.description && <AlertDialogDescription>{confirm.description}</AlertDialogDescription>}
        </AlertDialogHeader>
        {confirm.reason && (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="confirm-reason">
              {confirm.reason.label}
              {confirm.reason.required && <span className="text-destructive">*</span>}
            </Label>
            <Textarea
              id="confirm-reason"
              autoFocus
              value={reason}
              disabled={pending}
              onChange={(event) => setReason(event.target.value)}
              placeholder={confirm.reason.placeholder}
              className="min-h-20 text-base md:text-sm"
            />
          </div>
        )}
        {error && (
          <p role="alert" className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Annuler</AlertDialogCancel>
          <Button variant={confirm.destructive === false ? "default" : "destructive"} disabled={pending || missing} onClick={() => void go(confirm.reason ? reason.trim() : undefined)}>
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
 * A button of the bar of a selection (`bulkActions`): its icon and name,
 * red when `destructive`, asking first with `confirm` (e.g. « Supprimer 12
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
  return (
    <>
      <Button size="sm" variant="ghost" disabled={pending} onClick={trigger} className={destructive ? "text-destructive hover:text-destructive" : undefined}>
        {pending ? <LoaderCircleIcon className="animate-spin" data-icon="inline-start" /> : icon}
        {label}
      </Button>
      {dialog}
    </>
  );
}
