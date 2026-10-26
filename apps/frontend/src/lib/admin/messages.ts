import "server-only";
import { createTranslator, type NamespaceKeys, type NestedKeyOf } from "next-intl";
import { DEFAULT_LOCALE } from "@/i18n/request";
import adminMessages from "../../../messages/admin/fr.json";

type AdminMessages = typeof adminMessages;

/**
 * Translator of the back office. Its texts stay out of the request messages,
 * which the provider hands to the browser: they only reach the HTML of the
 * admin pages, rendered on the server.
 */
export function getAdminTranslations<Namespace extends NamespaceKeys<AdminMessages, NestedKeyOf<AdminMessages>>>(
  namespace: Namespace,
) {
  return createTranslator({ locale: DEFAULT_LOCALE, messages: adminMessages, namespace });
}
