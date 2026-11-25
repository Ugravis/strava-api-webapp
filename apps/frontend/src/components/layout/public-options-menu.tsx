"use client";

import { EllipsisVerticalIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@kilotrace/ui/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuGroup, DropdownMenuTrigger } from "@kilotrace/ui/components/ui/dropdown-menu";
import { LocaleSubmenu } from "@/components/i18n/locale-submenu";

/** The options of a visitor, at the right end of the public navbar: the language, picked before signing up and kept by the account then. */
export function PublicOptionsMenu() {
  const t = useTranslations("navbar");
  return (
    <DropdownMenu>
      <DropdownMenuTrigger render={<Button variant="ghost" size="icon" aria-label={t("options")} />}>
        <EllipsisVerticalIcon />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-48">
        <DropdownMenuGroup>
          <LocaleSubmenu signedIn={false} />
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
