"use client";

import { useActionState, useEffect, useEffectEvent, useId, useState, type ReactNode } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { Action } from "./action-state";
import { SubmitButton } from "./submit-button";

const DAY_MS = 86_400_000;

interface Option {
  value: string;
  label: string;
}

export interface ActionDialogProps {
  action: Action;
  /** The label is only told by a tooltip and to screen readers when `iconOnly`. Without it, `open` drives the dialog. */
  trigger?: { label: string; icon?: ReactNode; iconOnly?: boolean };
  /** Opened from elsewhere, e.g. a menu item, along with `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  /** After the action went through, e.g. to fetch a table again. */
  onSuccess?: () => void;
  title: string;
  description: string;
  submitLabel: string;
  cancelLabel: string;
  destructive?: boolean;
  /** Free text of the decision, filled from a preset or typed; posted as `reason`. */
  reason?: {
    label: string;
    placeholder: string;
    hint: string;
    presetsLabel: string;
    presets: string[];
    required: boolean;
    min: number;
    max: number;
  };
  /** Several values among the options, posted under `name`; one at least. */
  choices?: { name: string; legend: string; options: Option[] };
  /**
   * End of the action, posted as `until` (ISO 8601) unless indefinite: a
   * number of days, `indefinite`, or `custom` for a date picked by hand.
   */
  duration?: { label: string; options: Option[]; untilLabel: string };
  /** Text to type before the action is allowed, e.g. a username. */
  confirmation?: { label: string; expected: string };
}

/**
 * Confirmation of a back-office action, posted to a Server Action; the
 * outcome is told by a toast. Generic: its texts come from the caller.
 */
export function ActionDialog(props: ActionDialogProps) {
  const [own, setOwn] = useState(false);
  const open = props.open ?? own;
  const setOpen = props.onOpenChange ?? setOwn;
  const { trigger } = props;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && (
        <DialogTrigger
          render={
            <Button
              variant={props.destructive ? "destructive" : "outline"}
              size={trigger.iconOnly ? "icon-sm" : "xs"}
              aria-label={trigger.iconOnly ? trigger.label : undefined}
              title={trigger.iconOnly ? trigger.label : undefined}
            />
          }
        >
          {trigger.icon}
          {!trigger.iconOnly && trigger.label}
        </DialogTrigger>
      )}
      <DialogContent className="sm:max-w-md">
        {/* Remounted on every opening, so that the form starts empty. */}
        {open && <ActionDialogForm {...props} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function ActionDialogForm({
  action,
  title,
  description,
  submitLabel,
  cancelLabel,
  destructive,
  reason,
  choices,
  duration,
  confirmation,
  onSuccess,
  onDone,
}: ActionDialogProps & { onDone: () => void }) {
  const id = useId();
  const [result, formAction] = useActionState(action, null);
  const [reasonText, setReasonText] = useState("");
  const [chosen, setChosen] = useState<ReadonlySet<string>>(new Set());
  const [period, setPeriod] = useState(duration?.options[0]?.value ?? "");
  const [customUntil, setCustomUntil] = useState("");
  const [typed, setTyped] = useState("");

  const done = useEffectEvent(onDone);
  const succeeded = useEffectEvent(() => onSuccess?.());
  useEffect(() => {
    if (!result) return;
    if (result.ok) {
      toast.success(result.message);
      done();
      succeeded();
    } else {
      toast.error(result.message);
    }
  }, [result]);

  const until = untilOf(period, customUntil);
  const valid =
    (!reason?.required || reasonText.trim().length >= reason.min) &&
    (!choices || chosen.size > 0) &&
    (!duration || until !== undefined) &&
    (!confirmation || typed.trim() === confirmation.expected);

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      {choices && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{choices.legend}</legend>
          {choices.options.map((option) => (
            <Label key={option.value} className="flex items-center gap-2 font-normal">
              <Checkbox
                name={choices.name}
                value={option.value}
                checked={chosen.has(option.value)}
                onCheckedChange={(checked) =>
                  setChosen((current) => {
                    const next = new Set(current);
                    if (checked) next.add(option.value);
                    else next.delete(option.value);
                    return next;
                  })
                }
              />
              {option.label}
            </Label>
          ))}
        </fieldset>
      )}

      {duration && (
        <fieldset className="grid gap-2">
          <legend className="mb-2 text-sm font-medium">{duration.label}</legend>
          <div className="flex flex-wrap gap-1.5">
            {duration.options.map((option) => (
              <Button
                key={option.value}
                type="button"
                size="sm"
                variant={period === option.value ? "default" : "outline"}
                aria-pressed={period === option.value}
                onClick={() => setPeriod(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
          {period === "custom" && (
            <Label className="grid gap-1.5 font-normal">
              {duration.untilLabel}
              <Input
                type="datetime-local"
                value={customUntil}
                min={toLocalInput(new Date())}
                onChange={(event) => setCustomUntil(event.target.value)}
              />
            </Label>
          )}
          {until && <input type="hidden" name="until" value={until} />}
        </fieldset>
      )}

      {reason && (
        <div className="grid gap-2">
          <Label htmlFor={`${id}-reason`}>{reason.label}</Label>
          {reason.presets.length > 0 && (
            <div className="flex flex-wrap gap-1.5" role="group" aria-label={reason.presetsLabel}>
              {reason.presets.map((preset) => (
                <Button
                  key={preset}
                  type="button"
                  size="xs"
                  variant={reasonText === preset ? "secondary" : "outline"}
                  onClick={() => setReasonText(preset)}
                >
                  {preset}
                </Button>
              ))}
            </div>
          )}
          <Textarea
            id={`${id}-reason`}
            name="reason"
            value={reasonText}
            onChange={(event) => setReasonText(event.target.value)}
            placeholder={reason.placeholder}
            maxLength={reason.max}
            required={reason.required}
            rows={3}
          />
          <p className="text-xs text-muted-foreground">{reason.hint}</p>
        </div>
      )}

      {confirmation && (
        <Label className="grid gap-1.5 font-normal">
          {confirmation.label}
          <Input value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" spellCheck={false} />
        </Label>
      )}

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{cancelLabel}</DialogClose>
        <SubmitButton variant={destructive ? "destructive" : "default"} disabled={!valid} className={cn(destructive && "font-semibold")}>
          {submitLabel}
        </SubmitButton>
      </DialogFooter>
    </form>
  );
}

/** The end of the period, ISO 8601; null when indefinite, undefined while incomplete. */
function untilOf(period: string, customUntil: string): string | null | undefined {
  if (period === "" || period === "indefinite") return null;
  if (period === "custom") {
    const date = customUntil ? new Date(customUntil) : null;
    return date && date.getTime() > Date.now() ? date.toISOString() : undefined;
  }
  return new Date(Date.now() + Number(period) * DAY_MS).toISOString();
}

/** Value of a `datetime-local` input, in the local time of the browser. */
function toLocalInput(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}
