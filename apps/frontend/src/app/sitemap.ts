import type { MetadataRoute } from "next";
import { routes } from "@/config/routes";
import { siteConfig } from "@kilotrace/ui/config/site";
import { routing } from "@/i18n/routing";
import { localizedPath } from "@/lib/i18n/alternates";

/** Only public pages worth indexing, in every language; the authentication forms are left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  const page = (path: string, changeFrequency: "weekly" | "yearly", priority: number) =>
    routing.locales.map((locale) => ({
      url: `${siteConfig.url}${localizedPath(locale, path)}`,
      changeFrequency,
      priority,
      alternates: {
        languages: Object.fromEntries(routing.locales.map((other) => [other, `${siteConfig.url}${localizedPath(other, path)}`])),
      },
    }));
  return [...page(routes.home, "weekly", 1), ...page(routes.terms, "yearly", 0.2)];
}
