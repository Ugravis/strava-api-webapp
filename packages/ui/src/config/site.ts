import { MapIcon, type LucideIcon } from "lucide-react";

/** Branding, centralized so it can be changed in one place. */
export const siteConfig: {
  name: string;
  domain: string;
  url: string;
  adminUrl: string;
  adminName: { base: string; accent: string };
  logo: LucideIcon;
} = {
  name: "Kilotrace",
  /** Shown on the profile cards, which may be shared as images. */
  domain: "kilotrace.app",
  /** Canonical origin, used for absolute URLs in metadata, sitemap and structured data. */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://kilotrace.app",
  /** Origin of the back office, on its own host. */
  adminUrl: process.env.NEXT_PUBLIC_ADMIN_URL ?? "https://admin.kilotrace.app",
  /** Wordmark of the back office, its accent in blue. */
  adminName: { base: "Kilo", accent: "admin" },
  logo: MapIcon,
};
