"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { SearchResults } from "@/components/community/follows-dialog";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PROFILE_SEARCH_MIN_LENGTH } from "@/hooks/use-profile-search";

/** A magnifier opening a search of every user, those followed first, apart. */
export function ProfileSearchDialog() {
  const t = useTranslations("profile.search");
  const tCommunity = useTranslations("community.search");
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (!next) setQuery("");
      }}
    >
      <DialogTrigger render={<Button variant="ghost" size="icon-sm" aria-label={t("open")} title={t("open")} />}>
        <SearchIcon />
      </DialogTrigger>
      <DialogContent className="flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col gap-3 sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
        </DialogHeader>
        <InputGroup className="h-9 shrink-0">
          <InputGroupAddon>
            <SearchIcon aria-hidden />
          </InputGroupAddon>
          <InputGroupInput
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={tCommunity("placeholder")}
            aria-label={tCommunity("label")}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
        </InputGroup>
        <div
          className="-mx-4 min-h-40 flex-1 overflow-y-auto px-4"
          aria-live="polite"
          // Following a link to a profile closes the dialog.
          onClickCapture={(event) => {
            if ((event.target as HTMLElement).closest("a")) setOpen(false);
          }}
        >
          {query.trim().length >= PROFILE_SEARCH_MIN_LENGTH && <SearchResults query={query} />}
        </div>
      </DialogContent>
    </Dialog>
  );
}
