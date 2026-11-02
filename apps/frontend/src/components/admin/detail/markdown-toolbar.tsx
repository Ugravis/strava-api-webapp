"use client";

import { BoldIcon, CodeIcon, Heading2Icon, ItalicIcon, LinkIcon, ListIcon, ListOrderedIcon, QuoteIcon } from "lucide-react";
import type { KeyboardEvent, ReactNode } from "react";
import { Tip } from "@/components/admin/data-table";
import { cn } from "@/lib/utils";

/*
 * The buttons shaping a Markdown text above its field: around the words
 * picked (bold, italics, code, link), or before their lines (title, lists,
 * quote). A second press takes it off again.
 */

type Change = { text: string; start: number; end: number };

/** `mark` around the selection, or taken off when already there; the selection kept inside. */
function wrap(text: string, start: number, end: number, mark: string): Change {
  const before = text.slice(0, start);
  const after = text.slice(end);
  if (before.endsWith(mark) && after.startsWith(mark)) return { text: before.slice(0, -mark.length) + text.slice(start, end) + after.slice(mark.length), start: start - mark.length, end: end - mark.length };
  return { text: before + mark + text.slice(start, end) + mark + after, start: start + mark.length, end: end + mark.length };
}

/** `prefix(index)` before every line of the selection, or taken off when all of them have it. */
function lines(text: string, start: number, end: number, prefix: (index: number) => string, pattern: RegExp): Change {
  const from = text.lastIndexOf("\n", start - 1) + 1;
  const to = text.indexOf("\n", end) === -1 ? text.length : text.indexOf("\n", end);
  const picked = text.slice(from, to).split("\n");
  const on = picked.every((line) => pattern.test(line));
  const shaped = picked.map((line, index) => (on ? line.replace(pattern, "") : prefix(index) + line.replace(pattern, ""))).join("\n");
  return { text: text.slice(0, from) + shaped + text.slice(to), start: from, end: from + shaped.length };
}

/** A link around the words picked, its address picked to be typed. */
function link(text: string, start: number, end: number): Change {
  const label = text.slice(start, end) || "texte";
  const inserted = `[${label}](https://)`;
  const url = start + label.length + 3;
  return { text: text.slice(0, start) + inserted + text.slice(end), start: url, end: url + "https://".length };
}

const ACTIONS: { id: string; label: string; icon: ReactNode; keys?: string; apply: (text: string, start: number, end: number) => Change }[] = [
  { id: "bold", label: "Gras", icon: <BoldIcon />, keys: "b", apply: (text, start, end) => wrap(text, start, end, "**") },
  { id: "italic", label: "Italique", icon: <ItalicIcon />, keys: "i", apply: (text, start, end) => wrap(text, start, end, "*") },
  { id: "code", label: "Code", icon: <CodeIcon />, apply: (text, start, end) => wrap(text, start, end, "`") },
  { id: "link", label: "Lien", icon: <LinkIcon />, keys: "k", apply: link },
  { id: "title", label: "Titre", icon: <Heading2Icon />, apply: (text, start, end) => lines(text, start, end, () => "## ", /^#{1,3}\s+/) },
  { id: "list", label: "Liste", icon: <ListIcon />, apply: (text, start, end) => lines(text, start, end, () => "- ", /^\s*[-*]\s+/) },
  { id: "numbered", label: "Liste numérotée", icon: <ListOrderedIcon />, apply: (text, start, end) => lines(text, start, end, (index) => `${index + 1}. `, /^\s*\d+[.)]\s+/) },
  { id: "quote", label: "Citation", icon: <QuoteIcon />, apply: (text, start, end) => lines(text, start, end, () => "> ", /^>\s?/) },
];

/** Applies a change to the field, its selection set again once React has drawn the new text. */
function run(field: HTMLTextAreaElement, apply: (text: string, start: number, end: number) => Change, onChange: (text: string) => void) {
  const change = apply(field.value, field.selectionStart, field.selectionEnd);
  onChange(change.text);
  requestAnimationFrame(() => {
    field.focus();
    field.setSelectionRange(change.start, change.end);
  });
}

/** ⌘ B, ⌘ I, ⌘ K in the field: bold, italics, link. True when handled. */
export function markdownShortcut(event: KeyboardEvent<HTMLTextAreaElement>, onChange: (text: string) => void) {
  if (!(event.metaKey || event.ctrlKey) || event.shiftKey || event.altKey) return false;
  const action = ACTIONS.find((each) => each.keys === event.key.toLowerCase());
  if (!action) return false;
  event.preventDefault();
  run(event.currentTarget, action.apply, onChange);
  return true;
}

/**
 * The buttons above the field `field` (a textarea), each named in a bubble
 * (its shortcut too); `aside` on the right, e.g. the preview. Pressed
 * without taking the focus from the field, which would save it.
 */
export function MarkdownToolbar({ field, onChange, disabled, aside, className }: { field: HTMLTextAreaElement | null; onChange: (text: string) => void; disabled?: boolean; aside?: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {/* In the scale of the buttons floating beside it (✓, ✕, copy): as tall, its icons as large. */}
      <div role="toolbar" aria-label="Mise en forme" className="flex h-6 min-w-0 items-center overflow-x-auto rounded-md border bg-background shadow-xs [scrollbar-width:none]">
        {ACTIONS.map((action) => (
          <Tip key={action.id} label={action.keys ? `${action.label} (⌘ ${action.keys.toUpperCase()})` : action.label}>
            <button
              type="button"
              aria-label={action.label}
              disabled={disabled || !field}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => field && run(field, action.apply, onChange)}
              className="inline-flex h-full w-6 shrink-0 items-center justify-center text-muted-foreground outline-none first:rounded-l-[5px] last:rounded-r-[5px] hover:bg-muted hover:text-foreground focus-visible:bg-muted disabled:opacity-50 [&_svg]:size-3.5"
            >
              {action.icon}
            </button>
          </Tip>
        ))}
      </div>
      {aside && <span className="ml-auto flex shrink-0 items-center">{aside}</span>}
    </div>
  );
}
