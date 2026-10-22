"use client";

import { SearchIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { PROFILE_SEARCH_MIN_LENGTH, useProfileSearch } from "@/hooks/use-profile-search";
import { UserRow, UserRowsSkeleton } from "./user-row";

/** Search of the users by username or display name, with a button to follow each. */
export function UserSearch() {
  const t = useTranslations("community.search");
  const [query, setQuery] = useState("");
  const { results, loading, error } = useProfileSearch(query);

  return (
    <div className="flex flex-col gap-3">
      <InputGroup className="h-10 bg-card">
        <InputGroupAddon>
          <SearchIcon aria-hidden />
        </InputGroupAddon>
        <InputGroupInput
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("placeholder")}
          aria-label={t("label")}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          autoFocus
        />
      </InputGroup>
      <div aria-live="polite">
        {query.trim().length < PROFILE_SEARCH_MIN_LENGTH ? (
          <p className="px-1 text-sm text-muted-foreground">{t("hint")}</p>
        ) : loading ? (
          <UserRowsSkeleton count={3} />
        ) : error ? (
          <p className="px-1 text-sm text-destructive">{t("error")}</p>
        ) : results && results.length > 0 ? (
          <ul className="divide-y">
            {results.map((user) => (
              <UserRow key={user.id} user={user} />
            ))}
          </ul>
        ) : (
          <p className="px-1 text-sm text-muted-foreground">{t("empty")}</p>
        )}
      </div>
    </div>
  );
}
