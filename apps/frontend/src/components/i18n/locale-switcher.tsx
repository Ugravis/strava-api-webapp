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
import { isLocale, LOCALE_FLAGS, LOCALE_NAMES, LOCALES } from "@kilotrace/ui/i18n/locale";
import { useChangeLocale } from "./use-change-locale";

/**
 * The language of the site: in the footer, and in the navbar of the public
 * pages (`navbar`, its flag alone on a phone), so that a visitor picks it
 * before signing up; the account created then keeps it. Signed in, the
 * account keeps every change.
 */
export function LocaleSwitcher({ signedIn, navbar = false }: { signedIn: boolean; navbar?: boolean }) {
  const t = useTranslations("common");
  const { current, change, pending } = useChangeLocale(signedIn);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            variant="ghost"
            size="sm"
            className={navbar ? "px-2" : "-ml-2 w-fit text-muted-foreground"}
            aria-label={`${t("language")} : ${LOCALE_NAMES[current]}`}
            disabled={pending}
          />
        }
      >
        {navbar ? <span aria-hidden>{LOCALE_FLAGS[current]}</span> : <LanguagesIcon />}
        <span className={navbar ? "hidden sm:inline" : undefined}>{LOCALE_NAMES[current]}</span>
        <ChevronDownIcon className="opacity-60" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align={navbar ? "end" : "start"} className="min-w-40">
        <DropdownMenuRadioGroup value={current} onValueChange={(value) => isLocale(value) && change(value)}>
          {LOCALES.map((locale) => (
            <DropdownMenuRadioItem key={locale} value={locale} lang={locale}>
              <span aria-hidden>{LOCALE_FLAGS[locale]}</span>
              {LOCALE_NAMES[locale]}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
