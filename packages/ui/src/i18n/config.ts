import errorPages from "@kilotrace/ui/messages/error-pages.fr.json";
import messages from "@kilotrace/ui/messages/fr.json";

export { DEFAULT_LOCALE, TIME_ZONE } from "./locale";

/** Texts of the shared components and of the public site, also read by the back office. The error pages have their own file, which the global error page loads alone. */
export const sharedMessages = { ...messages, errorPages };
