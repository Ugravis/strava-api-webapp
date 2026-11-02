"use client";

import { CheckIcon, ImageUpIcon, LoaderCircleIcon, PipetteIcon, SearchIcon } from "lucide-react";
import { type PointerEvent, type ReactNode, useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { type DetailEditOption, OptionLabel, type PickerEdit, useCommit } from "./field-edit";
import { IconGrid } from "./icon-picker";

/*
 * The values of a field picked in a popover under it: a list, a colour, an
 * icon, an image. A pick of one option or icon saves it at once; several are
 * saved by « Valider » or as the popover closes; a colour or an image by
 * « Valider » only, closing the popover giving it up. Esc gives up, the
 * panel staying open.
 */

/** The hues offered first, those of the marks of the site. */
const PRESETS = [
  "#dc2626", "#ea580c", "#d97706", "#ca8a04", "#65a30d", "#16a34a", "#059669", "#0d9488", "#0891b2",
  "#0284c7", "#2563eb", "#4f46e5", "#7c3aed", "#9333ea", "#c026d3", "#db2777", "#e11d48", "#64748b",
];
const HEX = /^#[0-9a-f]{6}$/i;
/** The widths of the popover of an image: at first, and between which its bottom left corner resizes it. */
const IMAGE_WIDTH = { initial: 352, min: 288, max: 640 };
/** Beyond this many options, a search bar. */
const SEARCHED = 8;

type Draft = string | string[] | File | null;
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
  // Each opening starts again from the saved value.
  if (editing !== opened) {
    setOpened(editing);
    if (editing) setDraft(edit.value);
  }
  const { saving, commit } = useCommit(edit, () => onEditing(false));
  const pick = (value: Draft) => {
    setDraft(value);
    void commit(value);
  };

  return (
    <Popover
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
      <div ref={setAnchor} className={className}>
        {children}
      </div>
      <PopoverContent
        anchor={anchor}
        // An image grows from its bottom left corner, its right edge kept.
        align={edit.kind === "image" ? "end" : "start"}
        className={cn("relative gap-2 p-2", edit.kind === "icon" ? "w-80" : edit.kind === "image" ? "w-auto" : "w-64")}
        aria-label={label}
      >
        <div className="flex h-5 items-center justify-between px-1 text-xs font-medium text-muted-foreground">
          <span>
            {label}
            {(edit.kind === "select" || edit.kind === "multiselect") && (
              <span className="font-normal text-muted-foreground/70"> ({edit.kind === "select" ? "sélection unique" : "sélection multiple"})</span>
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
                setDraft(edit.options.map((option) => option.value).filter((each) => (each === value) !== (draft as string[]).includes(each)))
              }
            />
            <Button size="sm" disabled={saving} onClick={() => void commit(draft)}>
              Valider
            </Button>
          </>
        )}
        {edit.kind === "color" && (
          <ColorPicker presets={edit.presets ?? PRESETS} noneLabel={edit.noneLabel} value={draft as string | null} disabled={saving} onChange={setDraft} onDone={() => void commit(draft)} />
        )}
        {edit.kind === "image" && (
          <ImagePicker
            current={edit.value}
            accept={edit.accept ?? "image/png,image/jpeg,image/webp"}
            maxSize={edit.maxSize}
            noneLabel={edit.noneLabel}
            value={draft as string | File | null}
            disabled={saving}
            onChange={setDraft}
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

/** Swatches, any other hue by the pipette or its code: saved by « Valider » only. */
function ColorPicker({
  presets,
  noneLabel,
  value,
  disabled,
  onChange,
  onDone,
}: {
  presets: string[];
  noneLabel?: string;
  value: string | null;
  disabled?: boolean;
  onChange: (color: string | null) => void;
  onDone: () => void;
}) {
  const [code, setCode] = useState(value ?? "");
  const current = value?.toLowerCase() ?? null;
  const set = (color: string | null) => {
    setCode(color ?? "");
    onChange(color && color.toLowerCase());
  };

  return (
    <>
      <div role="radiogroup" aria-label="Couleurs proposées" className="grid grid-cols-9 gap-1.5 p-1">
        {presets.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={current === color}
            aria-label={color}
            title={color}
            disabled={disabled}
            onClick={() => set(color)}
            className={cn(
              "aspect-square rounded-full ring-offset-2 ring-offset-popover outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
              current === color && "ring-2 ring-foreground",
            )}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2">
        <label
          title="Autre couleur"
          className="relative grid size-8 shrink-0 cursor-pointer place-items-center rounded-md bg-[conic-gradient(#f43f5e,#f59e0b,#22c55e,#14b8a6,#3b82f6,#8b5cf6,#f43f5e)] ring-1 ring-foreground/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
          style={current && !presets.includes(current) ? { background: current } : undefined}
        >
          <PipetteIcon className="size-3.5 text-white drop-shadow" aria-hidden />
          <input type="color" value={current ?? "#000000"} disabled={disabled} onChange={(event) => set(event.target.value)} aria-label="Autre couleur" className="absolute inset-0 size-full cursor-pointer opacity-0" />
        </label>
        <Input
          value={code}
          disabled={disabled}
          onChange={(event) => {
            setCode(event.target.value);
            if (HEX.test(event.target.value)) onChange(event.target.value.toLowerCase());
          }}
          onKeyDown={(event) => event.key === "Enter" && HEX.test(code) && onDone()}
          placeholder="#rrggbb"
          aria-label="Code de la couleur"
          aria-invalid={code !== "" && !HEX.test(code)}
          className="h-8 font-mono text-sm"
        />
        <Button size="sm" disabled={disabled} onClick={onDone}>
          Valider
        </Button>
      </div>
      {noneLabel && (
        <Button size="sm" variant="ghost" disabled={disabled || value === null} onClick={() => set(null)}>
          {noneLabel}
        </Button>
      )}
    </>
  );
}

/**
 * The image shown, replaced by a file picked or dropped, or removed: saved
 * by « Valider » only, « Annuler » giving up. Its bottom left corner resizes it.
 */
function ImagePicker({
  current,
  accept,
  maxSize,
  noneLabel,
  value,
  disabled,
  onChange,
  onCancel,
  onDone,
}: {
  current: string | null;
  accept: string;
  maxSize?: number;
  noneLabel?: string;
  value: string | File | null;
  disabled?: boolean;
  onChange: (file: File | null) => void;
  onCancel: () => void;
  onDone: () => void;
}) {
  const preview = usePreview(value);
  const [width, setWidth] = useState(IMAGE_WIDTH.initial);
  const resize = (event: PointerEvent<HTMLDivElement>) => {
    event.preventDefault();
    const handle = event.currentTarget;
    handle.setPointerCapture(event.pointerId);
    const [x, from] = [event.clientX, width];
    const move = (each: globalThis.PointerEvent) => setWidth(Math.min(IMAGE_WIDTH.max, Math.max(IMAGE_WIDTH.min, from + x - each.clientX)));
    const end = () => {
      handle.removeEventListener("pointermove", move);
      handle.removeEventListener("pointerup", end);
    };
    handle.addEventListener("pointermove", move);
    handle.addEventListener("pointerup", end);
  };
  const take = (file: File | undefined) => {
    if (!file) return;
    const types = accept.split(",").map((each) => each.trim());
    if (!types.some((type) => (type.endsWith("/*") ? file.type.startsWith(type.slice(0, -1)) : file.type === type))) return toast.error("Ce format d'image n'est pas accepté.");
    if (maxSize !== undefined && file.size > maxSize) return toast.error(`Image trop lourde : ${Math.round(maxSize / 1024 / 1024 * 10) / 10} Mo au plus.`);
    onChange(file);
  };

  return (
    <div className="flex flex-col gap-2" style={{ width: width - 16 }}>
      <label
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          if (!disabled) take(event.dataTransfer.files[0]);
        }}
        className="relative grid aspect-video cursor-pointer place-items-center overflow-hidden rounded-md bg-muted ring-1 ring-foreground/10 has-focus-visible:ring-2 has-focus-visible:ring-ring"
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element -- any URL, an object URL included
          <img src={preview} alt="" className="size-full object-cover" />
        ) : (
          <span className="flex flex-col items-center gap-1 text-xs text-muted-foreground">
            <ImageUpIcon className="size-5" aria-hidden />
            Choisir ou déposer une image
          </span>
        )}
        <input type="file" accept={accept} disabled={disabled} onChange={(event) => take(event.target.files?.[0])} aria-label="Choisir une image" className="absolute inset-0 size-full cursor-pointer opacity-0" />
      </label>
      <div className="flex items-center gap-2">
        {noneLabel && (
          <Button size="sm" variant="ghost" disabled={disabled || value === null} onClick={() => onChange(null)}>
            {noneLabel}
          </Button>
        )}
        <Button size="sm" variant="outline" className="ml-auto" disabled={disabled} onClick={onCancel}>
          Annuler
        </Button>
        <Button size="sm" disabled={disabled || value === current} onClick={onDone}>
          Valider
        </Button>
      </div>
      <div
        role="separator"
        aria-label="Redimensionner"
        onPointerDown={resize}
        className="absolute bottom-0 left-0 size-4 cursor-nesw-resize touch-none rounded-bl-lg bg-[linear-gradient(45deg,transparent_45%,var(--color-border)_45%,var(--color-border)_55%,transparent_55%)]"
      />
    </div>
  );
}

/** The URL showing an image: its own, or that of a file picked, freed once replaced. */
function usePreview(value: string | File | null) {
  const url = useMemo(() => (value instanceof File ? URL.createObjectURL(value) : null), [value]);
  useEffect(() => () => void (url && URL.revokeObjectURL(url)), [url]);
  return url ?? (value as string | null);
}
