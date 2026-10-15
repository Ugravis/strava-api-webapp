import { HouseIcon, MapIcon, MilestoneIcon, UserIcon, type LucideIcon } from "lucide-react";
import { routes } from "./routes";

export interface NavigationItem {
  href: string;
  /** Key in the `nav` translation namespace. */
  labelKey: "dashboard" | "map" | "distances" | "profile";
  icon: LucideIcon;
}

/** Main sidebar entries. New sections only need to be declared here. */
export const mainNavigation: NavigationItem[] = [
  { href: routes.dashboard, labelKey: "dashboard", icon: HouseIcon },
  { href: routes.map, labelKey: "map", icon: MapIcon },
  { href: routes.distances, labelKey: "distances", icon: MilestoneIcon },
  { href: routes.profile, labelKey: "profile", icon: UserIcon },
];
