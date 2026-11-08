"use client";

import { CheckIcon, LoaderCircleIcon, PlusIcon, RotateCcwIcon, SearchIcon, XIcon } from "lucide-react";
import { type KeyboardEvent, type ReactNode, useEffect, useEffectEvent, useState } from "react";
import { PILL_TONES } from "@kilotrace/ui/components/admin/data-table";
import { Button } from "@kilotrace/ui/components/ui/button";
import { Input } from "@kilotrace/ui/components/ui/input";
import { cn } from "@kilotrace/ui/lib/utils";
import type { DetailEditOption } from "./edit-types";
import { OptionLabel } from "./edit-value";

/*
 * The insides of the popovers of free values (`tags`) and of another row
 * (`relation`).
 */

/** Suggestions shown at once, the rest found by typing. */
const SUGGESTED = 8;

/**
 * Free values: typed and added by Enter or a comma, removed by their ✕ or
 * Backspace in the empty field; a suggestion added by a click. Refused
 * (twice the same, too long, too many) with its reason under the field, in
 * the popover: a bubble would hide its buttons.
 */
export function TagsInput({
  value,
  suggestions = [],
  max,
  maxLength,
  placeholder,
  disabled,
  onChange,
}: {
  value: string[];
  suggestions?: string[];
  max?: number;
  maxLength?: number;
  placeholder?: string;
  disabled?: boolean;
  onChange: (value: string[]) => void;
}) {
  const [text, setText] = useState("");
  const [error, onError] = useState<string | null>(null);
  const has = (tag: string) => value.some((each) => each.toLowerCase() === tag.toLowerCase());
  const add = (raw: string) => {
    const tag = raw.trim();
    if (!tag) return;
    if (has(tag)) return onError(`« ${tag} » y est déjà.`);
    if (maxLength !== undefined && tag.length > maxLength) return onError(`${maxLength} caractères au plus par valeur.`);
    if (max !== undefined && value.length >= max) return onError(`${max} valeurs au plus.`);
    onChange([...value, tag]);
    setText("");
  };
  const onKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault();
      add(text);
    } else if (event.key === "Backspace" && !text && value.length > 0) {
      onChange(value.slice(0, -1));
    }
  };
  const words = text.trim().toLowerCase();
  const offered = suggestions.filter((each) => !has(each) && (!words || each.toLowerCase().includes(words))).slice(0, SUGGESTED);

  return (
    <div className="flex flex-col gap-2">
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {value.map((tag) => (
            <span key={tag} className={cn("inline-flex h-6 items-center gap-0.5 rounded-full pr-0.5 pl-2 text-xs font-medium", PILL_TONES.gray)}>
              {tag}
              <button
                type="button"
                disabled={disabled}
                aria-label={`Retirer ${tag}`}
                onClick={() => onChange(value.filter((each) => each !== tag))}
                className="inline-flex size-5 items-center justify-center rounded-full hover:bg-foreground/10 [&_svg]:size-3"
              >
                <XIcon />
              </button>
            </span>
          ))}
        </div>
      )}
      <Input
        autoFocus
        value={text}
        disabled={disabled}
        onChange={(event) => {
          setText(event.target.value);
          onError(null);
        }}
        onKeyDown={onKeyDown}
        placeholder={placeholder ?? "Ajouter puis Entrée"}
        aria-label="Ajouter une valeur"
        aria-invalid={!!error || undefined}
        className="h-8 text-sm"
      />
      {error && <p className="-mt-1 text-xs text-destructive">{error}</p>}
      {offered.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {offered.map((each) => (
            <button
              key={each}
              type="button"
              disabled={disabled}
              onClick={() => add(each)}
              className="inline-flex h-6 items-center gap-0.5 rounded-full border border-dashed px-2 text-xs text-muted-foreground hover:bg-muted hover:text-foreground [&_svg]:size-3"
            >
              <PlusIcon aria-hidden />
              {each}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * Rows found on the server as the query is typed (a pause of 250 ms), the
 * first ones at once; the one picked checked, `noneLabel` the choice of none.
 * A click picks.
 */
export function RelationList({
  search,
  selected,
  noneLabel,
  placeholder,
  disabled,
  onPick,
}: {
  search: (query: string) => Promise<DetailEditOption[]>;
  selected: DetailEditOption | null;
  noneLabel?: string;
  placeholder?: string;
  disabled?: boolean;
  onPick: (option: DetailEditOption | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [tries, setTries] = useState(0);
  const [answer, setAnswer] = useState<{ query: string; tries: number; options?: DetailEditOption[] } | null>(null);
  // The search of the page, stable or not.
  const find = useEffectEvent((words: string) => search(words));
  useEffect(() => {
    let live = true;
    const timer = setTimeout(
      () =>
        find(query.trim()).then(
          (options) => live && setAnswer({ query, tries, options }),
          () => live && setAnswer({ query, tries }),
        ),
      query ? 250 : 0,
    );
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [query, tries]);
  const loading = answer?.query !== query || answer.tries !== tries;
  const options = answer?.options;

  const row = (key: string, on: boolean, onClick: () => void, content: ReactNode) => (
    <button
      key={key}
      type="button"
      role="menuitemradio"
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
      <div className="relative">
        <SearchIcon className="pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2 text-muted-foreground" aria-hidden />
        <Input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder={placeholder ?? "Rechercher"} aria-label="Rechercher" className="h-8 pr-8 pl-8 text-sm" />
        {loading && <LoaderCircleIcon className="absolute top-1/2 right-2.5 size-3.5 -translate-y-1/2 animate-spin text-muted-foreground" aria-label="Recherche" />}
      </div>
      <div role="menu" className={cn("flex max-h-64 flex-col overflow-y-auto transition-opacity", loading && options && "opacity-60")}>
        {noneLabel && !query.trim() && row("~", selected === null, () => onPick(null), <span className="text-muted-foreground">{noneLabel}</span>)}
        {options?.map((option) => row(option.value, selected?.value === option.value, () => onPick(option), <OptionLabel option={option} />))}
        {!loading && !options && (
          <div className="flex flex-col items-center gap-2 py-4 text-center text-sm text-muted-foreground">
            Recherche impossible.
            <Button size="sm" variant="outline" onClick={() => setTries((n) => n + 1)}>
              <RotateCcwIcon aria-hidden />
              Réessayer
            </Button>
          </div>
        )}
        {!loading && options?.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucun résultat</p>}
        {!options && loading && Array.from({ length: 3 }, (_, at) => <span key={at} className="m-1 h-6 animate-pulse rounded-md bg-muted" />)}
      </div>
    </>
  );
}
