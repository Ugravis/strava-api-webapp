"use client";

import { LoaderCircleIcon, MapPinIcon } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useId, useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import type { CitySuggestion } from "@/lib/api/types";
import { countryName } from "@/lib/countries/country-format";
import { cn } from "@/lib/utils";
import { accountService } from "@/services/account.service";

/** Wait after the last key before searching. */
const SEARCH_DELAY_MS = 300;
const MIN_QUERY_LENGTH = 2;

interface CityFieldProps {
  id?: string;
  city: string;
  /** Null until a city is picked among the suggestions. */
  countryCode: string | null;
  onChange: (city: string, countryCode: string | null) => void;
  invalid?: boolean;
}

/** City of the profile, picked among the suggestions of the geocoder so that it exists. */
export function CityField({ id, city, countryCode, onChange, invalid }: CityFieldProps) {
  const t = useTranslations("fields");
  const locale = useLocale();
  const listId = useId();
  const [suggestions, setSuggestions] = useState<CitySuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const query = city.trim();
  // Searches only what is typed, not a city just picked.
  const searched = countryCode === null && query.length >= MIN_QUERY_LENGTH ? query : null;

  useEffect(() => {
    if (searched === null) return;
    let cancelled = false;
    const timer = setTimeout(() => {
      setSearching(true);
      accountService
        .searchCities(searched)
        .then(
          (found) => {
            if (cancelled) return;
            setSuggestions(found);
            setActive(0);
          },
          () => !cancelled && setSuggestions([]),
        )
        .finally(() => !cancelled && setSearching(false));
    }, SEARCH_DELAY_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [searched]);

  const shown = open && searched !== null ? suggestions : [];
  const pick = (suggestion: CitySuggestion) => {
    onChange(suggestion.name, suggestion.countryCode);
    setOpen(false);
  };

  return (
    <div className="relative">
      <InputGroup>
        <InputGroupAddon>
          <MapPinIcon />
        </InputGroupAddon>
        <InputGroupInput
          id={id}
          role="combobox"
          aria-expanded={shown.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-invalid={invalid}
          autoComplete="off"
          value={city}
          maxLength={60}
          placeholder={t("cityPlaceholder")}
          onChange={(event) => {
            onChange(event.target.value, null);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setOpen(false)}
          onKeyDown={(event) => {
            if (shown.length === 0) return;
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setActive((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + shown.length) % shown.length);
            } else if (event.key === "Enter") {
              event.preventDefault();
              pick(shown[active]);
            } else if (event.key === "Escape") {
              setOpen(false);
            }
          }}
        />
        <InputGroupAddon align="inline-end">
          {searching ? (
            <LoaderCircleIcon className="animate-spin" aria-hidden />
          ) : (
            countryCode && <span className="text-xs text-muted-foreground">{countryName(countryCode, locale)}</span>
          )}
        </InputGroupAddon>
      </InputGroup>
      {shown.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          // In the flow: the card of the section would clip a floating list.
          className="mt-1 overflow-hidden rounded-lg border bg-popover p-1 text-popover-foreground shadow-md"
        >
          {shown.map((suggestion, index) => (
            <li
              key={`${suggestion.name}-${suggestion.countryCode}-${suggestion.region ?? ""}`}
              role="option"
              aria-selected={index === active}
              // Before the blur of the input, which would close the list.
              onMouseDown={(event) => {
                event.preventDefault();
                pick(suggestion);
              }}
              onMouseEnter={() => setActive(index)}
              className={cn(
                "flex cursor-pointer flex-col rounded-md px-2 py-1.5 text-sm",
                index === active && "bg-accent text-accent-foreground",
              )}
            >
              <span>{suggestion.name}</span>
              <span className="text-xs text-muted-foreground">
                {[suggestion.region, countryName(suggestion.countryCode, locale)].filter(Boolean).join(", ")}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
