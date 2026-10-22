import { MapIcon, type LucideIcon } from "lucide-react";

/** Branding, centralized so it can be changed in one place. */
export const siteConfig: { name: string; domain: string; logo: LucideIcon } = {
  name: "Kilotrace",
  /** Shown on the profile cards, which may be shared as images. */
  domain: "kilotrace.app",
  logo: MapIcon,
};
