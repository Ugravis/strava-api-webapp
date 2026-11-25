"use client";

import { LanguagesIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@kilotrace/ui/components/ui/dropdown-menu";
import { isLocale, LOCALE_FLAGS, LOCALE_NAMES, LOCALES } from "@kilotrace/ui/i18n/locale";
import { useChangeLocale } from "./use-change-locale";

/** The language of the site, in a menu (the account's, the options of the public navbar); kept by the account when signed in. */
export function LocaleSubmenu({ signedIn = true }: { signedIn?: boolean }) {
  const t = useTranslations("common");
  const { current, change } = useChangeLocale(signedIn);

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <LanguagesIcon />
        {t("language")}
        <span className="ml-auto text-xs text-muted-foreground">
          {LOCALE_FLAGS[current]} {LOCALE_NAMES[current]}
        </span>
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-40">
        <DropdownMenuRadioGroup value={current} onValueChange={(value) => isLocale(value) && change(value)}>
          {LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale} lang={locale}>
              <span aria-hidden>{LOCALE_FLAGS[locale]}</span>
              {LOCALE_NAMES[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
