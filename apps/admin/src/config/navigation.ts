import { type AdminRole, AdminRole as Role, hasAdminRole } from "@kilotrace/shared";
import { LayoutDashboard, type LucideIcon } from "lucide-react";
import { routes } from "./routes";

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Lowest role that sees the entry, as the API enforces for its routes. */
  role: AdminRole;
}

export const NAV_ITEMS: readonly NavItem[] = [
  { href: routes.home, label: "Tableau de bord", icon: LayoutDashboard, role: Role.Support },
];

export function navItemsFor(role: AdminRole): NavItem[] {
  return NAV_ITEMS.filter((item) => hasAdminRole(role, item.role));
}
