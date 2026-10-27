import "server-only";
import type { AdminUserSummary } from "@kilotrace/shared/admin";
import { BanIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { getAdminTranslations } from "@/lib/admin/messages";

/** Status of an account at a glance: suspension, roles, Strava. */
export function UserBadges({ user }: { user: AdminUserSummary }) {
  const t = getAdminTranslations("users.badges");
  const role = getAdminTranslations("roles");
  return (
    <span className="flex flex-wrap gap-1">
      {user.suspension && (
        <Badge variant="destructive">
          <BanIcon />
          {t("suspended")}
        </Badge>
      )}
      {user.roles.map((each) => (
        <Badge key={each} className="bg-blue-500/15 text-blue-700 dark:text-blue-300">
          {role(each)}
        </Badge>
      ))}
      {user.stravaConnected && <Badge className="bg-orange-500/15 text-orange-700 dark:text-orange-300">{t("strava")}</Badge>}
    </span>
  );
}
