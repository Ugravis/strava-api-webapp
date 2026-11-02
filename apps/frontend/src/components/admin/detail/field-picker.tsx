"use client";

import { CheckIcon, LoaderCircleIcon, SearchIcon } from "lucide-react";
import { type ReactNode, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { useNoHover } from "@/hooks/use-no-hover";
import { ErrorBubble } from "./error-bubble";
import { SAVE_BUTTON } from "./field-buttons";
import type { DetailEditOption, PickerEdit } from "./edit-types";
import { OptionLabel } from "./edit-value";
import { useCommit } from "./field-edit";
import { RelationList, TagsInput } from "./field-lookup";
import { ColorPicker, COLOR_PRESETS } from "./color-picker";
import { IconGrid } from "./icon-picker";
import { IMAGE_TYPES, ImagePicker, imageRules } from "./image-picker";

/*
 * The values of a field picked in a popover under it: a list, a colour, an
 * icon, an image. A pick of one option or icon saves it at once; several are
 * saved by « Valider » or as the popover closes; a colour or an image by
 * « Valider » only, closing the popover giving it up. Esc gives up, the
 * panel staying open.
 */

/** Beyond this many options, a search bar. */
const SEARCHED = 8;

type Draft = string | string[] | File | DetailEditOption | null;
/** Kinds saved by « Valider » only: closing the popover gives them up. */
const VALIDATED = new Set(["color", "image"]);

/**
 * The value of a field, the popover anchored under it. Only `editing` opens
 * it, from the pencil; `onEditing` follows it.
 */
export function PickerField({
  edit,
  label,
  editing,
  onEditing,
  className,
  children,
}: {
  edit: PickerEdit;
  label: string;
  editing: boolean;
  onEditing: (editing: boolean) => void;
  className?: string;
  children: ReactNode;
}) {
  const [draft, setDraft] = useState<Draft>(edit.value);
  const [opened, setOpened] = useState(false);
  const [anchor, setAnchor] = useState<HTMLDivElement | null>(null);
  // On a phone, a tap outside only closes it, reaching nothing beneath.
  const noHover = useNoHover();
  const { saving, commit, error, setError } = useCommit(edit, () => onEditing(false));
  // Each opening starts again from the saved value, without the refusal of the last one.
  if (editing !== opened) {
    setOpened(editing);
    if (editing) setDraft(edit.value);
    if (error) setError(null);
  }
  const change = (value: Draft) => {
    setDraft(value);
    setError(null);
  };
  const pick = (value: Draft) => {
    change(value);
    void commit(value);
  };

  return (
    <Popover
      modal={noHover}
      open={editing}
      onOpenChange={(open, details) => {
        if (open || saving) return;
        // A press on the field itself (its pencil, toggling it) is left to it.
        if (details.reason === "outside-press" && details.event.target instanceof Node && anchor?.parentElement?.contains(details.event.target)) return;
        // Kept from the split panel, which would close on it.
        if (details.reason === "escape-key") details.event.preventDefault();
        if (details.reason === "escape-key" || VALIDATED.has(edit.kind)) onEditing(false);
        else void commit(draft);
      }}
    >
      <ErrorBubble anchor={anchor} message={editing ? error : null} />
      <div ref={setAnchor} className={className}>
        {children}
      </div>
      <PopoverContent
        anchor={anchor}
        // Centred under the value, in a cell as in a detail.
        align="center"
        className={cn("relative gap-2 p-2", edit.kind === "icon" ? "w-80" : edit.kind === "image" ? "w-auto" : edit.kind === "tags" || edit.kind === "relation" ? "w-72" : "w-64")}
        aria-label={label}
      >
        <div className="flex h-5 items-center justify-between px-1 text-xs font-medium text-muted-foreground">
          <span>
            {label}
            {(edit.kind === "select" || edit.kind === "multiselect" || edit.kind === "image" || edit.kind === "tags") && (
              <span className="font-normal text-muted-foreground/70">
                {" "}
                (
                {edit.kind === "select"
                  ? "sélection unique"
                  : edit.kind === "multiselect"
                    ? "sélection multiple"
                    : edit.kind === "tags"
                      ? `valeurs libres${edit.max !== undefined ? `, ${edit.max} max` : ""}`
                      : imageRules(edit.accept ?? IMAGE_TYPES, edit.maxSize)}
                )
              </span>
            )}
          </span>
          {saving && <LoaderCircleIcon className="size-3.5 animate-spin" aria-label="Enregistrement" />}
        </div>
        {edit.kind === "select" && (
          <OptionList options={edit.options} noneLabel={edit.noneLabel} selected={draft ? [draft as string] : []} disabled={saving} onToggle={(value) => pick(value)} />
        )}
        {edit.kind === "multiselect" && (
          <>
            <OptionList
              options={edit.options}
              selected={draft as string[]}
              multiple
              disabled={saving}
              // Kept in the order of the options.
              onToggle={(value) =>
                change(edit.options.map((option) => option.value).filter((each) => (each === value) !== (draft as string[]).includes(each)))
              }
            />
            <Button size="sm" className={SAVE_BUTTON} disabled={saving} onClick={() => void commit(draft)}>
              Valider
            </Button>
          </>
        )}
        {edit.kind === "tags" && (
          <>
            <TagsInput
              value={draft as string[]}
              suggestions={edit.suggestions}
              max={edit.max}
              maxLength={edit.maxLength}
              placeholder={edit.placeholder}
              disabled={saving}
              onChange={change}
            />
            <Button size="sm" className={SAVE_BUTTON} disabled={saving} onClick={() => void commit(draft)}>
              Valider
            </Button>
          </>
        )}
        {edit.kind === "relation" && (
          <RelationList search={edit.search} selected={draft as DetailEditOption | null} noneLabel={edit.noneLabel} placeholder={edit.placeholder} disabled={saving} onPick={pick} />
        )}
        {edit.kind === "color" && (
          <ColorPicker presets={edit.presets ?? COLOR_PRESETS} noneLabel={edit.noneLabel} value={draft as string | null} disabled={saving} onChange={change} onDone={() => void commit(draft)} />
        )}
        {edit.kind === "image" && (
          <ImagePicker
            current={edit.value}
            accept={edit.accept ?? IMAGE_TYPES}
            maxSize={edit.maxSize}
            noneLabel={edit.noneLabel}
            value={draft as string | File | null}
            disabled={saving}
            onChange={change}
            onError={setError}
            onCancel={() => onEditing(false)}
            onDone={() => void commit(draft)}
          />
        )}
        {edit.kind === "icon" && (
          <>
            <IconGrid value={draft as string | null} disabled={saving} onPick={pick} />
            {edit.noneLabel && (
              <Button size="sm" variant="ghost" disabled={saving || draft === null} onClick={() => pick(null)}>
                {edit.noneLabel}
              </Button>
            )}
          </>
        )}
      </PopoverContent>
    </Popover>
  );
}

/** The options of a list, a check on those picked; searched when many. */
function OptionList({
  options,
  noneLabel,
  selected,
  multiple,
  disabled,
  onToggle,
}: {
  options: DetailEditOption[];
  noneLabel?: string;
  selected: string[];
  multiple?: boolean;
  disabled?: boolean;
  onToggle: (value: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const words = query.trim().toLowerCase();
  const shown = words ? options.filter((option) => option.label.toLowerCase().includes(words)) : options;
  const row = (key: string, on: boolean, onClick: () => void, content: ReactNode) => (
    <button
      key={key}
      type="button"
      role={multiple ? "menuitemcheckbox" : "menuitemradio"}
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className="flex min-h-8 w-full items-center gap-2 rounded-md px-2 text-left text-sm outline-none hover:bg-muted focus-visible:bg-muted disabled:opacity-50"
    >
      <span className="min-w-0 flex-1">{content}</span>
      <CheckIcon className={cn("size-3.5 shrink-0 text-primary", !on && "invisible")} aria-hidden />
    </button>
  );

  return (
    <>
      {options.length > SEARCHED && (
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
          <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Rechercher" aria-label="Rechercher" className="h-8 pl-8 text-sm" />
        </div>
      )}
      <div role="menu" className="flex max-h-64 flex-col overflow-y-auto">
        {noneLabel && !words && row("~", selected.length === 0, () => onToggle(null), <span className="text-muted-foreground">{noneLabel}</span>)}
        {shown.map((option) => row(option.value, selected.includes(option.value), () => onToggle(option.value), <OptionLabel option={option} />))}
        {shown.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucun résultat</p>}
      </div>
    </>
  );
}
