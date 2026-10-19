import { HouseIcon, MapIcon, MilestoneIcon, UserIcon, type LucideIcon } from "lucide-react";
import type { ComponentType } from "react";
import { MapModulesNav } from "@/components/map/map-modules-nav";
import { routes } from "./routes";

/** Props of the quick access shown under an entry. */
export interface QuickAccessProps {
  /** Called once a link is followed, e.g. to close the navigation on mobile. */
  onNavigate: () => void;
}

export interface NavigationItem {
  href: string;
  /** Key in the `nav` translation namespace. */
  labelKey: "dashboard" | "map" | "distances" | "profile";
  icon: LucideIcon;
  /** Links into the section, shown under its entry on hover and while in the section. */
  quickAccess?: ComponentType<QuickAccessProps>;
}

/** Main sidebar entries. New sections only need to be declared here. */
export const mainNavigation: NavigationItem[] = [
  { href: routes.dashboard, labelKey: "dashboard", icon: HouseIcon },
  { href: routes.map, labelKey: "map", icon: MapIcon, quickAccess: MapModulesNav },
  { href: routes.distances, labelKey: "distances", icon: MilestoneIcon },
  { href: routes.profile, labelKey: "profile", icon: UserIcon },
];
