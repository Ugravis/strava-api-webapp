import { MapIcon, type LucideIcon } from "lucide-react";

/** Branding placeholders, centralized so they can be replaced in one place. */
export const siteConfig: { name: string; domain: string; logo: LucideIcon } = {
  name: "Strava Webapp",
  /** Shown on the profile cards, which may be shared as images. */
  domain: "stravawebapp.com",
  logo: MapIcon,
};
