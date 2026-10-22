import type { MetadataRoute } from "next";
import { PROTECTED_PREFIXES } from "@/config/routes";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: "*", allow: "/", disallow: ["/api/", ...PROTECTED_PREFIXES] },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
