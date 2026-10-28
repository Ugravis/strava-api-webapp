import "server-only";
import { type AdminPermission, type AdminRole, highestAdminRole } from "@kilotrace/shared/admin";
import { GlobeIcon, ShieldIcon } from "lucide-react";
import { NavLinks } from "@/components/app-shell/nav-links";
import { NavSwitchLink } from "@/components/app-shell/nav-switch-link";
import { DEFAULT_AUTHENTICATED_ROUTE } from "@/config/routes";
import { getAdminRoles } from "@/lib/admin/access";
import { getAdminTranslations } from "@/lib/admin/messages";
import { adminNavFor, adminRoutes } from "@/lib/admin/navigation";

/*
 * Sidebar slots of the back office, rendered on the server: the browser only
 * gets generic components, labelled here from the admin messages.
 */

/** Entries of the back office the permissions grant. */
export function AdminNavigation({ permissions }: { permissions: readonly AdminPermission[] }) {
  const t = getAdminTranslations("nav");
  const items = adminNavFor(permissions).map(({ key, href, icon: Icon, exact }) => ({
    href,
    label: t(key),
    icon: <Icon />,
    exact,
  }));
  return <NavLinks items={items} />;
}

/** In the sidebar of the site, the way to the back office: nothing at all for anyone without a role. */
export async function ToAdminLink() {
  const role = highestAdminRole(await getAdminRoles());
  if (!role) {
    return null;
  }
  return (
    <NavSwitchLink
      href={adminRoutes.overview}
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
