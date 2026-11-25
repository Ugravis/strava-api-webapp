import { DEFAULT_LOCALE, type Locale } from "./locales";

/**
 * The address of each page of the site in each language, after its prefix:
 * the key is the path of the code (and of English), the values what the
 * address bar shows, for search engines and readers alike. A page missing
 * here keeps its English path in every language.
 */
export const PATHNAMES = {
  "/": { en: "/", fr: "/", it: "/", es: "/", de: "/" },
  "/login": { en: "/login", fr: "/connexion", it: "/accesso", es: "/iniciar-sesion", de: "/anmelden" },
  "/register": { en: "/register", fr: "/inscription", it: "/registrazione", es: "/registro", de: "/registrieren" },
  "/register/google": {
    en: "/register/google",
    fr: "/inscription/google",
    it: "/registrazione/google",
    es: "/registro/google",
    de: "/registrieren/google",
  },
  "/forgot-password": {
    en: "/forgot-password",
    fr: "/mot-de-passe-oublie",
    it: "/password-dimenticata",
    es: "/contrasena-olvidada",
    de: "/passwort-vergessen",
  },
  "/terms": { en: "/terms", fr: "/conditions", it: "/condizioni", es: "/condiciones", de: "/nutzungsbedingungen" },
  "/dashboard": { en: "/dashboard", fr: "/tableau-de-bord", it: "/bacheca", es: "/panel", de: "/uebersicht" },
  "/achievements": { en: "/achievements", fr: "/succes", it: "/traguardi", es: "/logros", de: "/erfolge" },
  "/map": { en: "/map", fr: "/carte", it: "/mappa", es: "/mapa", de: "/karte" },
  "/profiles": { en: "/profiles", fr: "/profils", it: "/profili", es: "/perfiles", de: "/profile" },
  "/settings": { en: "/settings", fr: "/parametres", it: "/impostazioni", es: "/ajustes", de: "/einstellungen" },
  "/whats-new": { en: "/whats-new", fr: "/nouveautes", it: "/novita", es: "/novedades", de: "/neuigkeiten" },
} as const satisfies Record<string, Record<Locale, string>>;

export type AppPathname = keyof typeof PATHNAMES;

/** `/login?next=…#x` as its parts. */
export function splitHref(href: string): { pathname: string; search: string; hash: string } {
  const hashAt = href.indexOf("#");
  const hash = hashAt >= 0 ? href.slice(hashAt) : "";
  const rest = hashAt >= 0 ? href.slice(0, hashAt) : href;
  const searchAt = rest.indexOf("?");
  return {
    pathname: searchAt >= 0 ? rest.slice(0, searchAt) || "/" : rest || "/",
    search: searchAt >= 0 ? rest.slice(searchAt) : "",
    hash,
  };
}

/** The path a page shows in `locale`, without its language prefix; unknown paths unchanged. */
export function localizedPathname(locale: Locale, pathname: string): string {
  return (PATHNAMES as Record<string, Record<Locale, string>>)[pathname]?.[locale] ?? pathname;
}

/** The path of the code of an address shown in `locale` (without its prefix); unknown addresses unchanged. */
export function internalPathname(locale: Locale, pathname: string): string {
  for (const [internal, localized] of Object.entries(PATHNAMES) as [string, Record<Locale, string>][]) {
    if (localized[locale] === pathname) return internal;
  }
  return pathname;
}

/**
 * The address of a page of the site in `locale`, prefixed unless it is the
 * default language and with its localized path, as the site routes them;
 * for links built outside of it, e.g. in emails.
 */
export function localePath(locale: Locale, href: string): string {
  const { pathname, search, hash } = splitHref(href);
  const path = localizedPathname(locale, pathname);
  const prefixed = locale === DEFAULT_LOCALE ? path : path === "/" ? `/${locale}` : `/${locale}${path}`;
  return `${prefixed}${search}${hash}`;
}
