import { HouseIcon, MapIcon, TrophyIcon, UserIcon, UsersIcon, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import type { ComponentType } from "react";
import { AchievementTabsNav } from "@/components/distances/achievement-tabs-nav";
import { useOpenMapModule } from "@/components/map/map-module-channel";
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
  labelKey: "dashboard" | "map" | "distances" | "community" | "profile";
  icon: LucideIcon;
  /** Links into the section, unfolded under its entry on hover and while in the section, together in a box. */
  quickAccess?: ComponentType<QuickAccessProps>;
  /** Whether one of the links of the quick access is active: the entry itself is then not marked active. */
  useQuickAccessActive?: () => boolean;
}

/** Main sidebar entries. New sections only need to be declared here. */
export const mainNavigation: NavigationItem[] = [
  { href: routes.dashboard, labelKey: "dashboard", icon: HouseIcon },
  {
    href: routes.map,
    labelKey: "map",
    icon: MapIcon,
    quickAccess: MapModulesNav,
    useQuickAccessActive: () => useOpenMapModule() !== null,
  },
  {
    href: routes.achievements,
    labelKey: "distances",
    icon: TrophyIcon,
    quickAccess: AchievementTabsNav,
    useQuickAccessActive: () => usePathname() === routes.achievements,
  },
  { href: routes.community, labelKey: "community", icon: UsersIcon },
  { href: routes.profile, labelKey: "profile", icon: UserIcon },
];
