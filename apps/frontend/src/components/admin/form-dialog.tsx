"use client";

import { CheckIcon, Loader2Icon, SearchIcon } from "lucide-react";
import { useActionState, useEffect, useEffectEvent, useId, useState, useTransition, type ReactNode } from "react";
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
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";
import type { Action } from "./action-state";
import { SubmitButton } from "./submit-button";

interface Option {
  value: string;
  label: string;
}

interface BaseField {
  name: string;
  label: string;
  hint?: string;
  /** Half the width of the form, beside another half field, from `sm`. */
  half?: boolean;
}

export type FormField = BaseField &
  (
    | { kind: "text"; defaultValue?: string; required?: boolean; maxLength?: number; pattern?: string; readOnly?: boolean }
    | { kind: "textarea"; defaultValue?: string; required?: boolean; maxLength?: number }
    | {
        kind: "number";
        defaultValue?: string;
        required?: boolean;
        /** Unit shown after the value, by the value of a select of the form. */
        unit?: { field: string; byValue: Record<string, string> };
      }
    | { kind: "select"; defaultValue: string; options: Option[] }
    /** `#rrggbb`, or nothing at all when the default is kept. */
    | { kind: "color"; defaultValue: string | null; noneLabel: string }
    | { kind: "icons"; defaultValue: string; options: (Option & { icon: ReactNode })[] }
    /** One user among the results of a search, posted by id. */
    | {
        kind: "user";
        search: (query: string) => Promise<UserOption[]>;
        placeholder: string;
        emptyLabel: string;
      }
  );

export interface UserOption {
  id: string;
  username: string;
  displayName: string | null;
  avatarUrl: string | null;
  /** Shown under the name, e.g. the email. */
  hint?: string;
}

export interface FormDialogProps {
  action: Action;
  trigger: { label: string; icon?: ReactNode; iconOnly?: boolean; variant?: "default" | "outline" | "ghost" };
  title: string;
  description: string;
  submitLabel: string;
  cancelLabel: string;
  fields: FormField[];
}

/**
 * Form of a back-office entity in a dialog, posted to a Server Action; the
 * outcome is told by a toast. Generic: its texts come from the caller.
 */
export function FormDialog(props: FormDialogProps) {
  const [open, setOpen] = useState(false);
  const { trigger } = props;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            variant={trigger.variant ?? "outline"}
            size={trigger.iconOnly ? "icon-sm" : "sm"}
            aria-label={trigger.iconOnly ? trigger.label : undefined}
            title={trigger.iconOnly ? trigger.label : undefined}
          />
        }
      >
        {trigger.icon}
        {!trigger.iconOnly && trigger.label}
      </DialogTrigger>
      <DialogContent className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-xl">
        {/* Remounted on every opening, so that the form starts from the saved values. */}
        {open && <FormDialogForm {...props} onDone={() => setOpen(false)} />}
      </DialogContent>
    </Dialog>
  );
}

function FormDialogForm({
  action,
  title,
  description,
  submitLabel,
  cancelLabel,
  fields,
  onDone,
}: FormDialogProps & { onDone: () => void }) {
  const [result, formAction] = useActionState(action, null);
  // Values of the selects, read by the units of the number fields.
  const [selected, setSelected] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.flatMap((field) => (field.kind === "select" ? [[field.name, field.defaultValue]] : []))),
  );

  const done = useEffectEvent(onDone);
  useEffect(() => {
    if (!result) return;
    if (result.ok) {
      toast.success(result.message);
      done();
    } else {
      toast.error(result.message);
    }
  }, [result]);

  return (
    <form action={formAction} className="grid gap-4">
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>

      <div className="grid gap-4 sm:grid-cols-2">
        {fields.map((field) => (
          <div key={field.name} className={cn("grid content-start gap-1.5", !field.half && "sm:col-span-2")}>
            <FieldInput
              field={field}
              selected={selected}
              onSelect={(value) => setSelected((current) => ({ ...current, [field.name]: value }))}
            />
            {field.hint && <p className="text-xs text-muted-foreground">{field.hint}</p>}
          </div>
        ))}
      </div>

      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{cancelLabel}</DialogClose>
        <SubmitButton>{submitLabel}</SubmitButton>
      </DialogFooter>
    </form>
  );
}

const SELECT_CLASS =
  "h-8 w-full min-w-0 rounded-lg border border-input bg-transparent px-2.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 dark:bg-input/30";

function FieldInput({
  field,
  selected,
  onSelect,
}: {
  field: FormField;
  selected: Record<string, string>;
  onSelect: (value: string) => void;
}) {
  const id = useId();
  const label = <Label htmlFor={id}>{field.label}</Label>;
  switch (field.kind) {
    case "text":
      return (
        <>
          {label}
          <Input
            id={id}
            name={field.name}
            defaultValue={field.defaultValue}
            required={field.required}
            maxLength={field.maxLength}
            pattern={field.pattern}
            readOnly={field.readOnly}
            className={cn(field.readOnly && "text-muted-foreground")}
            autoComplete="off"
          />
        </>
      );
    case "textarea":
      return (
        <>
          {label}
          <Textarea
            id={id}
            name={field.name}
            defaultValue={field.defaultValue}
            required={field.required}
            maxLength={field.maxLength}
            rows={3}
          />
        </>
      );
    case "number": {
      const unit = field.unit && field.unit.byValue[selected[field.unit.field] ?? ""];
      return (
        <>
          {label}
          <div className="flex items-center gap-2">
            <Input
              id={id}
              name={field.name}
              defaultValue={field.defaultValue}
              required={field.required}
              inputMode="decimal"
              autoComplete="off"
            />
            {unit && <span className="shrink-0 text-sm text-muted-foreground">{unit}</span>}
          </div>
        </>
      );
    }
    case "select":
      return (
        <>
          {label}
          <select
            id={id}
            name={field.name}
            value={selected[field.name]}
            onChange={(event) => onSelect(event.target.value)}
            className={SELECT_CLASS}
          >
            {field.options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </>
      );
    case "color":
      return <ColorInput id={id} field={field} />;
    case "icons":
      return <IconPicker field={field} />;
    case "user":
      return <UserPicker id={id} field={field} />;
  }
}

function ColorInput({ id, field }: { id: string; field: Extract<FormField, { kind: "color" }> }) {
  const [none, setNone] = useState(field.defaultValue === null);
  const [color, setColor] = useState(field.defaultValue ?? "#3B82F6");
  return (
    <>
      <Label htmlFor={id}>{field.label}</Label>
      <div className="flex items-center gap-3">
        <input
          id={id}
          type="color"
          value={color}
          disabled={none}
          onChange={(event) => setColor(event.target.value)}
          className="h-8 w-12 cursor-pointer rounded-md border bg-transparent p-0.5 disabled:cursor-not-allowed disabled:opacity-40"
        />
        <Label className="flex items-center gap-2 font-normal">
          <Checkbox checked={none} onCheckedChange={(checked) => setNone(checked === true)} />
          {field.noneLabel}
        </Label>
      </div>
      {!none && <input type="hidden" name={field.name} value={color} />}
    </>
  );
}

function IconPicker({ field }: { field: Extract<FormField, { kind: "icons" }> }) {
  const [value, setValue] = useState(field.defaultValue);
  return (
    <fieldset className="grid gap-1.5">
      <legend className="mb-1.5 text-sm font-medium">{field.label}</legend>
      <div className="grid max-h-40 grid-cols-[repeat(auto-fill,minmax(2.25rem,1fr))] gap-1 overflow-y-auto rounded-lg border p-1.5">
        {field.options.map((option) => (
          <label
            key={option.value}
            title={option.label}
            className={cn(
              "flex aspect-square cursor-pointer items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50 [&_svg]:size-4",
              value === option.value && "bg-primary text-primary-foreground hover:bg-primary",
            )}
          >
            <input
              type="radio"
              name={field.name}
              value={option.value}
              checked={value === option.value}
              onChange={() => setValue(option.value)}
              className="sr-only"
              aria-label={option.label}
            />
            {option.icon}
          </label>
        ))}
      </div>
    </fieldset>
  );
}

const SEARCH_DELAY_MS = 250;

/** Search of a user, the choice kept shown while searching again. */
function UserPicker({ id, field }: { id: string; field: Extract<FormField, { kind: "user" }> }) {
  const [query, setQuery] = useState("");
  // Tied to their query, so that clearing the search clears them too.
  const [found, setFound] = useState<{ query: string; options: UserOption[] } | null>(null);
  const [chosen, setChosen] = useState<UserOption | null>(null);
  const [pending, startSearch] = useTransition();

  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) return;
    let stale = false;
    const timer = setTimeout(() => {
      startSearch(async () => {
        const options = await field.search(trimmed);
        if (!stale) setFound({ query: trimmed, options });
      });
    }, SEARCH_DELAY_MS);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
  }, [query, field]);

  const trimmed = query.trim();
  const results = trimmed && found?.query === trimmed ? found.options : null;
  const options = chosen && !results?.some((option) => option.id === chosen.id) ? [chosen, ...(results ?? [])] : (results ?? []);

  return (
    <>
      <Label htmlFor={id}>{field.label}</Label>
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input
          id={id}
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={field.placeholder}
          autoComplete="off"
          className="pl-8"
        />
        {pending && (
          <Loader2Icon className="absolute top-1/2 right-2.5 size-4 -translate-y-1/2 animate-spin text-muted-foreground" aria-hidden />
        )}
      </div>
      {options.length > 0 ? (
        <div role="radiogroup" aria-label={field.label} className="grid max-h-56 gap-0.5 overflow-y-auto rounded-lg border p-1">
          {options.map((option) => (
            <label
              key={option.id}
              className={cn(
                "flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 transition-colors hover:bg-muted has-focus-visible:ring-3 has-focus-visible:ring-ring/50",
                chosen?.id === option.id && "bg-muted",
              )}
            >
              <input
                type="radio"
                name={field.name}
                value={option.id}
                checked={chosen?.id === option.id}
                onChange={() => setChosen(option)}
                required
                className="sr-only"
              />
              <UserAvatar user={option} className="size-7" fallbackClassName="text-[10px]" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{option.displayName ?? `@${option.username}`}</span>
                <span className="block truncate text-xs text-muted-foreground">
                  @{option.username}
                  {option.hint && ` · ${option.hint}`}
                </span>
              </span>
              {chosen?.id === option.id && <CheckIcon className="size-4 shrink-0 text-primary" aria-hidden />}
            </label>
          ))}
        </div>
      ) : (
        results && !pending && <p className="text-sm text-muted-foreground">{field.emptyLabel}</p>
      )}
    </>
  );
}
