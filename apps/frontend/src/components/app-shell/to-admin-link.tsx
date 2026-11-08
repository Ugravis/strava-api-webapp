"use client";

import type { AdminRole } from "@kilotrace/shared/admin";
import { ShieldIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { NavSwitchLink } from "@kilotrace/ui/components/app-shell/nav-switch-link";
import { SidebarMenuItem, SidebarSeparator } from "@kilotrace/ui/components/ui/sidebar";
import { siteConfig } from "@kilotrace/ui/config/site";

/**
 * For a member of the team only, the way to the back office, on its own
 * host: the one mention of it in the public site. For anyone else, only
 * the separator it ends with, so the account menu stays set apart.
 */
export function ToAdminLink({ role }: { role: AdminRole | null }) {
  const t = useTranslations("nav");
  if (!role) {
    return (
      <SidebarMenuItem>
        <SidebarSeparator className="mx-0 mb-1" />
      </SidebarMenuItem>
    );
  }
  return (
    <NavSwitchLink
      href={new URL("/dashboard", siteConfig.adminUrl).toString()}
      label={t("toAdmin")}
      caption={t(`adminRoles.${role}`)}
      icon={<ShieldIcon />}
      external
    />
  );
}
