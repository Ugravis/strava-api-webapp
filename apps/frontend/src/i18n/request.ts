import { DEFAULT_LOCALE, sharedMessages, TIME_ZONE } from "@kilotrace/ui/i18n/config";
import { getRequestConfig } from "next-intl/server";

export { DEFAULT_LOCALE };

export default getRequestConfig(async () => ({
  locale: DEFAULT_LOCALE,
  timeZone: TIME_ZONE,
  messages: sharedMessages,
}));
