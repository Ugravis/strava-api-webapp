import { ADMIN_LOCALE, loadMessages, TIME_ZONE } from "@kilotrace/ui/i18n/config";
import { getRequestConfig } from "next-intl/server";

export { ADMIN_LOCALE };

/** The texts of the shared components, in the single language of the back office; its own texts stay on the server (lib/admin/messages.ts). */
export default getRequestConfig(async () => ({
  locale: ADMIN_LOCALE,
  timeZone: TIME_ZONE,
  messages: await loadMessages(ADMIN_LOCALE),
}));
