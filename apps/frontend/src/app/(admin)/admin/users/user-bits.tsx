import "server-only";
import { type AdminDistinctionKind, type AdminRole, type AdminUserSummary, highestAdminRole } from "@kilotrace/shared/admin";
import { BanIcon, CrownIcon, KeyRoundIcon, type LucideIcon, RocketIcon, ShieldCheckIcon, ShieldIcon } from "lucide-react";
import type { ReactNode } from "react";
import { GoogleIcon } from "@/components/auth/google-icon";
import { StravaIcon } from "@/components/strava/strava-icon";
import { getAdminTranslations } from "@/lib/admin/messages";
import { cn } from "@/lib/utils";

/*
 * Small marks of an account, shared by the list and the panel.
 */

const ROLE_COLORS: Record<AdminRole, string> = {
  support: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  admin: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "super-admin": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

/** A small badge beside the name of a member of the team, named after their highest role. */
export function RoleBadge({ roles }: { roles: readonly string[] }) {
  const role = highestAdminRole(roles);
  if (!role) return null;
  const label = getAdminTranslations("roles")(role);
  return (
    <span role="img" aria-label={label} title={label} className={cn("inline-flex h-4 shrink-0 items-center rounded-full px-1", ROLE_COLORS[role])}>
      <ShieldIcon className="size-2.5" aria-hidden />
    </span>
  );
}

/** A small red badge beside the name of a suspended account. */
export function SuspendedMark() {
  const label = getAdminTranslations("users.badges")("suspended");
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex h-4 shrink-0 items-center rounded-full bg-destructive/15 px-1 text-destructive">
      <BanIcon className="size-2.5" aria-hidden />
    </span>
  );
}

/** An icon in a light grey box, named on hover. */
function IconBox({ label, small, children }: { label: string; small?: boolean; children: ReactNode }) {
  return (
    <span
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-md bg-muted",
        small ? "size-5 [&_svg]:size-3" : "size-7 [&_svg]:size-4",
      )}
    >
      {children}
    </span>
  );
}

/** The ways the account signs in, and Strava when linked; a dash without any. */
export function ConnectionIcons({ user, small }: { user: AdminUserSummary; small?: boolean }) {
  const t = getAdminTranslations("users.connections");
  const items = [
    user.stravaConnected && { key: "strava" as const, icon: <StravaIcon className="text-[#fc4c02]" /> },
    user.signInMethods.includes("google") && { key: "google" as const, icon: <GoogleIcon /> },
    user.signInMethods.includes("password") && { key: "password" as const, icon: <KeyRoundIcon className="text-muted-foreground" /> },
  ].filter((item) => item !== false);
  return (
    <IconRow small={small}>
      {items.map(({ key, icon }) => (
        <IconBox key={key} label={t(key)} small={small}>
          {icon}
        </IconBox>
      ))}
    </IconRow>
  );
}

export const DISTINCTION_ICONS: Record<AdminDistinctionKind, { icon: LucideIcon; color: string }> = {
  founder: { icon: CrownIcon, color: "text-amber-500" },
  team: { icon: ShieldCheckIcon, color: "text-blue-500" },
  early_member: { icon: RocketIcon, color: "text-muted-foreground" },
};

/** An icon of a non-sport badge, as on the profiles of the site. */
export function DistinctionIcon({ kind, small }: { kind: AdminDistinctionKind; small?: boolean }) {
  const { icon: Icon, color } = DISTINCTION_ICONS[kind];
  return (
    <IconBox label={getAdminTranslations("user.distinctions")(kind)} small={small}>
      <Icon className={color} aria-hidden />
    </IconBox>
  );
}

/** The non-sport badges of the account; a dash without any. */
export function DistinctionIcons({ user, small }: { user: AdminUserSummary; small?: boolean }) {
  return (
    <IconRow small={small}>
      {user.distinctions.map(({ kind }) => (
        <DistinctionIcon key={kind} kind={kind} small={small} />
      ))}
    </IconRow>
  );
}

function IconRow({ small, children }: { small?: boolean; children: ReactNode[] }) {
  if (children.length === 0) {
    // Nothing at all on a card, where the space is the dash.
    return small ? null : <span className="text-muted-foreground">—</span>;
  }
  return <span className={cn("flex items-center", small ? "gap-1" : "gap-1.5")}>{children}</span>;
}
