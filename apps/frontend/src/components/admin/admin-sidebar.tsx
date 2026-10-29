import "server-only";
import { type AdminNavigationCounts, type AdminRole, highestAdminRole } from "@kilotrace/shared/admin";
import { GlobeIcon, ShieldIcon } from "lucide-react";
import { NavLinks } from "@/components/app-shell/nav-links";
import { NavSwitchLink } from "@/components/app-shell/nav-switch-link";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/config/routes";
import { getAdminRoles } from "@/lib/admin/access";
import { adminApi } from "@/lib/admin/api";
import { getAdminTranslations } from "@/lib/admin/messages";
import { ADMIN_NAV, adminRoutes } from "@/lib/admin/navigation";

/*
 * Sidebar slots of the back office, rendered on the server: the browser only
 * gets generic components, labelled here from the admin messages.
 */

/** Entries of the back office by group, with the size of the catalogs when the API answers. */
export async function AdminNavigation() {
  const t = getAdminTranslations("nav");
  const counts = await adminApi<AdminNavigationCounts>("/navigation/counts");
  return ADMIN_NAV.map((group, index) => (
    <NavLinks
      key={group.key}
      separated={index > 0}
      title={t(`groups.${group.key}`)}
      items={group.items.map(({ key, href, icon: Icon, count }) => ({
        href,
        label: t(key),
        icon: <Icon />,
        badge: count && counts.ok ? counts.data[count] : undefined,
      }))}
    />
  ));
}

/** In the sidebar of the site, the way to the back office: nothing at all for anyone without a role. */
export async function ToAdminLink() {
  const role = highestAdminRole(await getAdminRoles());
  if (!role) {
    return null;
  }
  return (
    <NavSwitchLink
      href={adminRoutes.dashboard}
      label={getAdminTranslations("shell")("toAdmin")}
      caption={getAdminTranslations("roles")(role)}
      icon={<ShieldIcon />}
    />
  );
}

/** In the sidebar of the back office, the way back to the site. */
export function ToAppLink({ roles }: { roles: readonly AdminRole[] }) {
  const role = highestAdminRole(roles);
  return (
    <NavSwitchLink
      href={DEFAULT_AUTHENTICATED_ROUTE}
      label={getAdminTranslations("shell")("toApp")}
      caption={role ? getAdminTranslations("roles")(role) : ""}
      icon={<GlobeIcon />}
    />
  );
}
