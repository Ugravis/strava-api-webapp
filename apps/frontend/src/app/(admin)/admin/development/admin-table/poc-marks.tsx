"use client";

import { highestAdminRole } from "@kilotrace/shared/admin";
import { BanIcon, KeyRoundIcon, ShieldIcon } from "lucide-react";
import { GoogleIcon } from "@/components/auth/google-icon";
import { type IconItem, Mark, type Pill, type Tone } from "@/components/admin/data-table";
import { BadgeIcon } from "@/components/distances/badge-icon";
import { StravaIcon } from "@/components/strava/strava-icon";
import { cn } from "@/lib/utils";
import type { PocCategory, PocUser } from "./poc-data";

/** What the cells of the kit need from the accounts of the demo. */

export const ROLES: Record<string, { label: string; tone: Tone }> = {
  support: { label: "Support", tone: "gray" },
  admin: { label: "Admin", tone: "blue" },
  "super-admin": { label: "Super-admin", tone: "violet" },
};

export const STATUSES = {
  active: { label: "Actif", tone: "green" },
  suspended: { label: "Suspendu", tone: "red" },
  staff: { label: "Équipe", tone: "violet" },
} satisfies Record<PocUser["status"], { label: string; tone: Tone }>;

export function UserMarks({ user }: { user: PocUser }) {
  const role = highestAdminRole(user.roles);
  return (
    <>
      {role && <Mark {...ROLES[role]!} icon={<ShieldIcon />} />}
      {user.status === "suspended" && <Mark label="Suspendu" tone="red" icon={<BanIcon />} />}
    </>
  );
}

export const CONNECTIONS = {
  strava: { label: "Strava", icon: <StravaIcon className="text-[#fc4c02]" /> },
  google: { label: "Google", icon: <GoogleIcon /> },
  password: { label: "Mot de passe", icon: <KeyRoundIcon className="text-muted-foreground" /> },
};

export function connectionsOf(user: PocUser): (keyof typeof CONNECTIONS)[] {
  return [...(user.stravaConnected ? ["strava" as const] : []), ...user.signInMethods];
}

export const connectionItems = (user: PocUser): IconItem[] => connectionsOf(user).map((key) => ({ key, ...CONNECTIONS[key] }));

export const tagItems = (user: PocUser): IconItem[] =>
  user.userTags.map((tag) => ({
    key: tag.id,
    label: tag.name,
    icon: <BadgeIcon icon={tag.icon} className={cn(!tag.color && "text-muted-foreground")} style={tag.color ? { color: tag.color } : undefined} aria-hidden />,
  }));

const CATEGORIES: Record<PocCategory, Pill> = {
  runner: { label: "Coureur", tone: "green" },
  cyclist: { label: "Cycliste", tone: "sky" },
  hiker: { label: "Randonneur", tone: "amber" },
  swimmer: { label: "Nageur", tone: "cyan" },
  triathlete: { label: "Triathlète", tone: "fuchsia" },
};

export const categoryPills = (user: PocUser): Pill[] => user.categories.map((category) => CATEGORIES[category]);
