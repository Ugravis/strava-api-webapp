"use client";

import { ChevronDownIcon, LanguagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@kilotrace/ui/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@kilotrace/ui/components/ui/dropdown-menu";
import { isLocale, LOCALE_NAMES, LOCALES } from "@kilotrace/ui/i18n/locale";
import { useChangeLocale } from "./use-change-locale";

/** The language of the site, in the footer; also kept by the account when signed in. */
export function LocaleSwitcher({ signedIn }: { signedIn: boolean }) {
  const t = useTranslations("common");
  const { current, change, pending } = useChangeLocale(signedIn);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<Button variant="ghost" size="sm" className="-ml-2 w-fit text-muted-foreground" aria-label={`${t("language")} : ${LOCALE_NAMES[current]}`} disabled={pending} />}
      >
        <LanguagesIcon />
        {LOCALE_NAMES[current]}
        <ChevronDownIcon className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="min-w-40">
        <DropdownMenuRadioGroup value={current} onValueChange={(value) => isLocale(value) && change(value)}>
          {LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale} lang={locale}>
              {LOCALE_NAMES[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
