"use client";

import { useFormatter, useTranslations } from "next-intl";
import { useState } from "react";
import { Command, CommandEmpty, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import type { DistanceBadge } from "@/lib/api/types";
import { matchScore } from "@/lib/countries/country-search";
import { BadgeIcon } from "./badge-icon";

interface BadgeSearchProps {
  /** Every badge, whatever the theme shown. */
  badges: DistanceBadge[];
  onPick: (badgeId: string) => void;
}

/**
 * Search of the badges by name, accents and case ignored; the family of
 * sports is searched too, its matches after those of the name.
 */
export function BadgeSearch({ badges, onPick }: BadgeSearchProps) {
  const t = useTranslations("distances");
  const format = useFormatter();
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);

  const pick = (badgeId: string) => {
    setQuery("");
    setOpen(false);
    (document.activeElement as HTMLElement | null)?.blur();
    onPick(badgeId);
  };

  return (
    <Command
      label={t("search.label")}
      filter={(_, search, keywords = []) => {
        const [name, ...others] = keywords;
        const byName = matchScore(name ?? "", search);
        return byName > 0 ? byName : others.some((other) => matchScore(other, search) > 0) ? 0.25 : 0;
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
      className="relative overflow-visible rounded-lg! bg-transparent p-0 [&_[data-slot=command-input-wrapper]]:p-0 [&_[data-slot=input-group]]:h-9! [&_[data-slot=input-group]]:bg-card! [&_[data-slot=input-group]]:border-border dark:[&_[data-slot=input-group]]:border-input"
    >
      <CommandInput
        value={query}
        onValueChange={(value) => {
          setQuery(value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        placeholder={t("search.placeholder")}
      />
      {open && query.trim() !== "" && (
        <CommandList
          // Clicking a result keeps the focus in the field until it is picked.
          onMouseDown={(event) => event.preventDefault()}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-80 rounded-lg bg-popover p-1 shadow-lg ring-1 ring-foreground/10"
        >
          <CommandEmpty>{t("search.empty")}</CommandEmpty>
          {badges.map((badge) => (
            <CommandItem
              key={badge.id}
              value={badge.id}
              keywords={[badge.name, t(`families.${badge.family}`)]}
              onSelect={pick}
            >
              <BadgeIcon icon={badge.icon} className="text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{badge.name}</span>
              <span className="text-xs text-muted-foreground tabular-nums">
                {t(`families.${badge.family}`)} ·{" "}
                {format.number(Math.floor(badge.progress * 100) / 100, { style: "percent" })}
              </span>
            </CommandItem>
          ))}
        </CommandList>
      )}
    </Command>
  );
}
