import { loadMessages, TIME_ZONE } from "@kilotrace/ui/i18n/config";
import { hasLocale } from "next-intl";
import { getRequestConfig } from "next-intl/server";
import { routing } from "./routing";

export default getRequestConfig(async ({ requestLocale }) => {
  const requested = await requestLocale;
  const locale = hasLocale(routing.locales, requested) ? requested : routing.defaultLocale;
  return { locale, timeZone: TIME_ZONE, messages: await loadMessages(locale) };
});
