import { UserIcon, type LucideIcon } from "lucide-react";
import { routes } from "./routes";

export interface NavigationItem {
  href: string;
  /** Key in the `nav` translation namespace. */
  labelKey: "profile";
  icon: LucideIcon;
}

/** Main sidebar entries. New sections only need to be declared here. */
export const mainNavigation: NavigationItem[] = [
  { href: routes.profile, labelKey: "profile", icon: UserIcon },
];
