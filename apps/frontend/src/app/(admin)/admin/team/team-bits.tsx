import "server-only";
import type { AdminRole } from "@kilotrace/shared/admin";
import { CrownIcon, KeyRoundIcon, type LucideIcon, ShieldIcon } from "lucide-react";
import { KpiTile } from "@/components/admin/kpi-tile";
import type { SeriesColorName } from "@/components/admin/statistics/palette";
import { getAdminTranslations } from "@/lib/admin/messages";

const ROLE_COLORS: Record<AdminRole, SeriesColorName> = {
  support: "aqua",
  admin: "blue",
  "super-admin": "yellow",
};

export const ROLE_ICONS: Record<AdminRole, LucideIcon> = {
  support: ShieldIcon,
  admin: KeyRoundIcon,
  "super-admin": CrownIcon,
};

/** A role, what it grants and how many members hold it. */
export function RoleSummary({ role, count }: { role: AdminRole; count: number }) {
  const t = getAdminTranslations("team");
  return (
    <KpiTile
      icon={ROLE_ICONS[role]}
      color={ROLE_COLORS[role]}
      label={getAdminTranslations("roles")(role)}
      value={count.toLocaleString("fr-FR")}
      detail={t(`roleHints.${role}`)}
    />
  );
}
