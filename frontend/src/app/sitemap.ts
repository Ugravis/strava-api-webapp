import type { MetadataRoute } from "next";
import { routes } from "@/config/routes";
import { siteConfig } from "@/config/site";

/** Only public pages worth indexing; the authentication forms are left out. */
export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: siteConfig.url, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}${routes.terms}`, changeFrequency: "yearly", priority: 0.2 },
  ];
}
