import "server-only";
import { type AdminRole, type AdminUserSummary, highestAdminRole } from "@kilotrace/shared/admin";
import { BanIcon, CrownIcon, KeyRoundIcon, type LucideIcon, RocketIcon, ShieldCheckIcon } from "lucide-react";
import { GoogleIcon } from "@/components/auth/google-icon";
import { StravaIcon } from "@/components/strava/strava-icon";
import { Badge } from "@/components/ui/badge";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";

/*
 * Small marks of an account, shared by the list and the panel.
 */

const ROLE_COLORS: Record<AdminRole, string> = {
  support: "bg-slate-400",
  admin: "bg-blue-500",
  "super-admin": "bg-violet-500",
};

/** A dot beside the name of a member of the team, named after their highest role. */
export function RoleDot({ roles }: { roles: readonly string[] }) {
  const role = highestAdminRole(roles);
  if (!role) return null;
  const label = getAdminTranslations("roles")(role);
  return (
    <span role="img" aria-label={label} title={label} className={cn("inline-block size-2 shrink-0 rounded-full", ROLE_COLORS[role])} />
  );
}

/** The ways the account signs in, and Strava when linked. */
export function ConnectionIcons({ user }: { user: AdminUserSummary }) {
  const t = getAdminTranslations("users.connections");
  const items = [
    user.stravaConnected && { key: "strava", icon: <StravaIcon className="size-4 text-[#fc4c02]" /> },
    user.signInMethods.includes("google") && { key: "google", icon: <GoogleIcon className="size-4" /> },
    user.signInMethods.includes("password") && { key: "password", icon: <KeyRoundIcon className="size-4 text-muted-foreground" /> },
  ].filter((item) => item !== false);
  return (
    <span className="flex items-center gap-1.5">
      {items.map(({ key, icon }) => {
        const label = t(key as "strava" | "google" | "password");
        return (
          <span key={key} role="img" aria-label={label} title={label} className="inline-flex">
            {icon}
          </span>
        );
      })}
    </span>
  );
}

const DISTINCTION_ICONS: Record<string, { icon: LucideIcon; color: string }> = {
  founder: { icon: CrownIcon, color: "text-amber-500" },
  team: { icon: ShieldCheckIcon, color: "text-blue-500" },
  early_member: { icon: RocketIcon, color: "text-muted-foreground" },
};

/** The non-sport badges, as on the profiles of the site. */
export function DistinctionIcons({ user }: { user: AdminUserSummary }) {
  const t = getAdminTranslations("user.distinctions");
  return (
    <span className="flex items-center gap-1.5">
      {user.distinctions.map(({ kind }) => {
        const { icon: Icon, color } = DISTINCTION_ICONS[kind];
        return (
          <span key={kind} role="img" aria-label={t(kind)} title={t(kind)} className="inline-flex">
            <Icon className={cn("size-4", color)} aria-hidden />
          </span>
        );
      })}
    </span>
  );
}

export function SuspendedBadge() {
  return (
    <Badge variant="destructive">
      <BanIcon />
      {getAdminTranslations("users.badges")("suspended")}
    </Badge>
  );
}
