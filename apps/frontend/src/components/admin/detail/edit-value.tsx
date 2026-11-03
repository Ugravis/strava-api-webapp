"use client";

import { LoaderCircleIcon } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { DateCell, EmptyValue, NumberCell, PILL_TONES, Tip } from "@/components/admin/data-table";
import { Switch } from "@/components/ui/switch";
import { cn } from "@/lib/utils";
import type { DetailEditOption, DetailFieldEdit } from "./edit-types";
import { ErrorBubble } from "./error-bubble";
import { editEmpty, useCommit } from "./field-edit";
import { SWITCH_ON } from "./field-buttons";
import { LucideIconByName } from "./icon-picker";
import { Markdown } from "@/components/markdown/markdown";

/** An option as a list shows it: a pill of its tone, or its icon and label. */
export function OptionLabel({ option }: { option: DetailEditOption }) {
  if (option.tone) return <span className={cn("inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium", PILL_TONES[option.tone])}>{option.label}</span>;
  return (
    <span className="flex min-w-0 items-center gap-1.5">
      {option.icon && <span className="inline-flex shrink-0 text-muted-foreground [&_svg]:size-3.5">{option.icon}</span>}
      <span className="truncate">{option.label}</span>
      {option.description && <span className="truncate text-xs text-muted-foreground">{option.description}</span>}
    </span>
  );
}

/** An option picked, as a value shows it: a link to its `href` outside a draft, the row around never opened by its click. */
function PickedOption({ option, linked }: { option: DetailEditOption; linked: boolean }) {
  if (!linked || !option.href) return <OptionLabel option={option} />;
  return (
    <Link href={option.href} onClick={(event) => event.stopPropagation()} className="min-w-0 rounded-sm underline-offset-2 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50">
      <OptionLabel option={option} />
    </Link>
  );
}

/** A colour as a field shows it: its swatch and its code. */
export function ColorValue({ color }: { color: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className="size-4 shrink-0 rounded-full ring-1 ring-foreground/10" style={{ backgroundColor: color }} aria-hidden />
      <code className="font-mono text-xs">{color}</code>
    </span>
  );
}

/** The value of a field without children, drawn after its kind; `bare`: without its words, e.g. a switch without « Oui » / « Non » in a table. */
export function EditValue({ edit, bare }: { edit: DetailFieldEdit; bare?: boolean }) {
  // Bound to a draft at rest: told, not switched.
  if (edit.kind === "switch") return edit.draft ? <span className="text-muted-foreground">{edit.value ? "Oui" : "Non"}</span> : <SwitchValue edit={edit} bare={bare} />;
  if (editEmpty(edit)) return <EmptyValue />;
  switch (edit.kind) {
    case "number":
      return <NumberCell value={edit.value} zero unit={edit.unit} />;
    case "date":
      return <DateCell iso={edit.value} time={edit.time} />;
    case "select": {
      const option = edit.options.find((each) => each.value === edit.value);
      return option ? <PickedOption option={option} linked={!edit.draft} /> : edit.value;
    }
    case "multiselect":
      return (
        <span className="flex flex-wrap items-center gap-x-2 gap-y-1 py-1">
          {edit.value.map((value) => {
            const option = edit.options.find((each) => each.value === value);
            return option ? <PickedOption key={value} option={option} linked={!edit.draft} /> : <span key={value}>{value}</span>;
          })}
        </span>
      );
    case "color":
      return <ColorValue color={edit.value!} />;
    case "email":
    case "url":
      return (
        <a
          href={edit.kind === "email" ? `mailto:${edit.value}` : edit.value!}
          target="_blank"
          rel="noreferrer"
          // Kept from the row of a table.
          onClick={(event) => event.stopPropagation()}
          className="truncate underline-offset-2 hover:underline"
        >
          {edit.value}
        </a>
      );
    case "markdown":
      return <Markdown source={edit.value!} highlight={edit.highlight} />;
    case "tags":
      return (
        <span className="flex flex-wrap items-center gap-1 py-1">
          {edit.value.map((tag) => (
            <span key={tag} className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-medium", PILL_TONES.gray)}>
              {tag}
            </span>
          ))}
        </span>
      );
    case "relation":
      return <OptionLabel option={edit.value!} />;
    case "image":
      return (
        // eslint-disable-next-line @next/next/no-img-element -- any URL, an object URL included
        <img src={edit.value!} alt="" className="my-1 h-10 max-w-24 rounded-sm object-cover ring-1 ring-foreground/10" />
      );
    case "icon":
      return (
        <span className="flex items-center gap-2">
          <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">
            <LucideIconByName name={edit.value!} />
          </span>
          <code className="truncate font-mono text-xs">{edit.value}</code>
        </span>
      );
    default:
      return edit.value;
  }
}

/** A switch saving as soon as switched, « Oui » or « Non » beside it unless `bare`. */
function SwitchValue({ edit, bare }: { edit: Extract<DetailFieldEdit, { kind: "switch" }>; bare?: boolean }) {
  const { saving, commit, error } = useCommit(edit, () => {});
  const [anchor, setAnchor] = useState<HTMLSpanElement | null>(null);
  return (
    <span ref={setAnchor} className="flex items-center gap-2">
      <ErrorBubble anchor={anchor} message={error} />
      {edit.locked ? (
        <Tip label={edit.locked}>
          <span tabIndex={0} className="inline-flex cursor-not-allowed">
            <Switch checked={edit.value} disabled aria-label={edit.locked} className={SWITCH_ON} />
          </span>
        </Tip>
      ) : (
        <Switch checked={edit.value} disabled={saving} onCheckedChange={(next) => void commit(next)} aria-label={edit.value ? "Oui" : "Non"} className={SWITCH_ON} />
      )}
      {!bare && <span className="text-muted-foreground">{edit.value ? "Oui" : "Non"}</span>}
      {saving && <LoaderCircleIcon className="size-3.5 animate-spin text-muted-foreground" aria-hidden />}
    </span>
  );
}
