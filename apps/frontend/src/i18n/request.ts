import { getRequestConfig } from "next-intl/server";

/** Single locale for now: messages are already extracted to ease adding new ones. */
export const DEFAULT_LOCALE = "fr";

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  timeZone: "Europe/Paris",
  messages: (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default,
}));
