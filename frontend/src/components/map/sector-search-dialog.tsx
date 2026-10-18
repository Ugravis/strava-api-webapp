"use client";

import { useFormatter, useLocale, useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Skeleton } from "@/components/ui/skeleton";
import { useCountryCodes } from "@/hooks/use-country-codes";
import type { CountryCompletion } from "@/lib/api/types";
import { countryFlag, countryName, percentDecimals } from "@/lib/countries/country-format";
import { matchScore } from "@/lib/countries/country-search";

interface SectorSearchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPick: (code: string) => void;
  /** Countries visited by the user, most visited first; null while loading. */
  visited: CountryCompletion[] | null;
  /** The sector shown, checked in the list. */
  current: string | null;
}

interface Option {
  code: string;
  name: string;
  /** Completion of its large tiles, when visited and known. */
  share: number | null;
}

const SKELETON_ROWS = 6;

/**
 * Popup in the middle of the screen searching the sectors by name: for now
 * every country, those visited first, with the share of their large tiles
 * completed. Accents and case are ignored.
 */
export function SectorSearchDialog({ open, onOpenChange, onPick, visited, current }: SectorSearchDialogProps) {
  const t = useTranslations("map.sector.search");
  const locale = useLocale();
  const format = useFormatter();
  const { codes, error } = useCountryCodes(open);
  // The popup opens at once: its rows, a few hundred, are rendered in the
  // next frames, its skeleton shown meanwhile.
  const [listReady, setListReady] = useState(false);
  useEffect(() => {
    if (!open) return;
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setListReady(true));
    });
    return () => {
      cancelAnimationFrame(frame);
      setListReady(false);
    };
  }, [open]);

  const groups = useMemo(() => {
    if (!codes) return null;
    const known = new Set(codes);
    const visitedCodes = new Set(visited?.map((country) => country.code));
    const option = (code: string, share: number | null): Option => ({ code, name: countryName(code, locale), share });
    return {
      visited: (visited ?? [])
        .filter((country) => known.has(country.code))
        .map(({ code, tiles }) => option(code, tiles.total ? tiles.visited / tiles.total : null)),
      others: codes
        .filter((code) => !visitedCodes.has(code))
        .map((code) => option(code, null))
        .sort((a, b) => a.name.localeCompare(b.name, locale)),
    };
  }, [codes, visited, locale]);

  const item = ({ code, name, share }: Option) => (
    <CommandItem
      key={code}
      value={code}
      keywords={[name]}
      data-checked={code === current}
      onSelect={() => onPick(code)}
    >
      <span aria-hidden className="text-base leading-none">
        {countryFlag(code)}
      </span>
      <span className="min-w-0 flex-1 truncate">{name}</span>
      {share !== null && (
        <span className="text-xs text-muted-foreground tabular-nums">
          {format.number(share, {
            style: "percent",
            minimumFractionDigits: percentDecimals(share),
            maximumFractionDigits: percentDecimals(share),
          })}
        </span>
      )}
    </CommandItem>
  );

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={t("title")}
      description={t("description")}
      className="top-1/2 -translate-y-1/2 sm:max-w-md"
    >
      <Command
        // The name is searched, in the language of the page; the code too, typed in full.
        filter={(code, search, keywords) =>
          code.toLowerCase() === search.trim().toLowerCase() ? 1 : matchScore(keywords?.[0] ?? code, search)
        }
      >
        <CommandInput placeholder={t("placeholder")} />
        {/* Of a fixed height: the popup stays still while the list is filtered. */}
        <CommandList className="h-80 max-h-[50svh]">
          {groups && listReady ? (
            <>
              <CommandEmpty>{t("empty")}</CommandEmpty>
              {groups.visited.length > 0 && <CommandGroup heading={t("visited")}>{groups.visited.map(item)}</CommandGroup>}
              <CommandGroup heading={groups.visited.length > 0 ? t("others") : t("all")}>
                {groups.others.map(item)}
              </CommandGroup>
            </>
          ) : error ? (
            <p role="alert" className="px-3 py-6 text-center text-sm text-destructive">
              {t("error")}
            </p>
          ) : (
            <div className="flex flex-col gap-1 p-1" aria-busy>
              {Array.from({ length: SKELETON_ROWS }, (_, index) => (
                <Skeleton key={index} className="h-8 w-full" />
              ))}
            </div>
          )}
        </CommandList>
      </Command>
    </CommandDialog>
  );
}
