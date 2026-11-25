"use client";

import { NextIntlClientProvider, useLocale, useMessages } from "next-intl";
import { type ReactNode, useEffect } from "react";
import { TIME_ZONE } from "@kilotrace/ui/i18n/locale";
import { useRouter } from "@/i18n/navigation";
import { accountService } from "@/services/account.service";

/**
 * The dates of the signed-in pages in the time zone of the account, the
 * same on the server and in the browser (no mismatch on hydration). The
 * account follows its browser: told once it differs (a first visit, a
 * journey), the pages drawn again with it. Before, Paris.
 */
export function AccountTimeZone({ timeZone, children }: { timeZone: string | null; children: ReactNode }) {
  const locale = useLocale();
  const messages = useMessages();
  const router = useRouter();

  useEffect(() => {
    const browser = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!browser || browser === timeZone) return;
    accountService.setTimeZone(browser).then(
      () => router.refresh(),
      () => undefined,
    );
  }, [timeZone, router]);

  return (
    <NextIntlClientProvider locale={locale} messages={messages} timeZone={timeZone ?? TIME_ZONE}>
      {children}
    </NextIntlClientProvider>
  );
}
