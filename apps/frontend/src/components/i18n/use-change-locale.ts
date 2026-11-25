"use client";

import type { Locale } from "@kilotrace/ui/i18n/locale";
import { useLocale } from "next-intl";
import { useTransition } from "react";
import { usePathname, useRouter } from "@/i18n/navigation";
import { accountService } from "@/services/account.service";

/**
 * Moves the current page to another language, its query and anchor kept;
 * the navigation writes the cookie that keeps the choice. A signed-in
 * account also keeps it, for its emails and notifications: a failure there
 * does not hold the page back, the next choice saves it again.
 */
export function useChangeLocale(signedIn: boolean) {
  const current = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  function change(locale: Locale) {
    if (locale === current) return;
    if (signedIn) void accountService.setLocale(locale).catch(() => undefined);
    const { search, hash } = window.location;
    startTransition(() => router.replace(`${pathname}${search}${hash}`, { locale, scroll: false }));
  }

  return { current, change, pending };
}
