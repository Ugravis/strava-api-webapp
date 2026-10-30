"use client";

import { type AdminUserTagLook, highestAdminRole } from "@kilotrace/shared/admin";
import { BanIcon, CopyCheckIcon, CopyIcon, KeyRoundIcon, ShieldIcon } from "lucide-react";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { GoogleIcon } from "@/components/auth/google-icon";
import { BadgeIcon } from "@/components/distances/badge-icon";
import { StravaIcon } from "@/components/strava/strava-icon";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";
import { POC_NOW, type PocCategory, type PocUser } from "./poc-data";

/*
 * Browser copies of the marks of `users/user-bits.tsx` and of the admin
 * formats, which are server-only: enough for the POC, shared afterwards.
 */

export const ROLE_LABELS = { support: "Support", admin: "Admin", "super-admin": "Super-admin" };
const ROLE_COLORS = {
  support: "bg-slate-500/15 text-slate-700 dark:text-slate-300",
  admin: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  "super-admin": "bg-violet-500/15 text-violet-700 dark:text-violet-300",
};

export function RoleBadge({ roles }: { roles: readonly string[] }) {
  const role = highestAdminRole(roles);
  if (!role) return null;
  return (
    <span role="img" aria-label={ROLE_LABELS[role]} title={ROLE_LABELS[role]} className={cn("inline-flex h-4 shrink-0 items-center rounded-full px-1", ROLE_COLORS[role])}>
      <ShieldIcon className="size-2.5" aria-hidden />
    </span>
  );
}

export function SuspendedMark() {
  return (
    <span role="img" aria-label="Suspendu" title="Suspendu" className="inline-flex h-4 shrink-0 items-center rounded-full bg-destructive/15 px-1 text-destructive">
      <BanIcon className="size-2.5" aria-hidden />
    </span>
  );
}

/** Avatar, username and marks, on a single line. */
export function UserCell({ user }: { user: PocUser }) {
  return (
    <span className="flex max-w-40 items-center gap-2 sm:max-w-56">
      <UserAvatar user={user} className="size-5" fallbackClassName="text-[9px]" />
      <Truncate className="font-medium text-foreground">@{user.username}</Truncate>
      <RoleBadge roles={user.roles} />
      {user.status === "suspended" && <SuspendedMark />}
    </span>
  );
}

/**
 * A text cut to its width, shown whole in a bubble after a pause on it,
 * only when it is actually cut.
 */
export function Truncate({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={(next) => setOpen(next && !!ref.current && ref.current.scrollWidth > ref.current.clientWidth)}>
      <TooltipTrigger delay={500} render={<span ref={ref} className={cn("block min-w-0 truncate", className)} />}>
        {children}
      </TooltipTrigger>
      <TooltipContent className="max-w-sm break-all">{children}</TooltipContent>
    </Tooltip>
  );
}

/** Floats at the right of its cell on hover, copies its text. */
export function CopyButton({ value }: { value: string | null }) {
  const [copied, setCopied] = useState(false);
  useEffect(() => {
    if (!copied) return;
    const timer = setTimeout(() => setCopied(false), 1500);
    return () => clearTimeout(timer);
  }, [copied]);
  if (!value) return null;
  return (
    <Tooltip>
      <TooltipTrigger
        delay={400}
        closeOnClick={false}
        render={<button type="button" />}
        aria-label={copied ? "Copié" : "Copier"}
        onClick={(event) => {
          event.stopPropagation();
          void navigator.clipboard.writeText(value).then(() => setCopied(true));
        }}
        className="absolute top-1/2 right-1.5 inline-flex size-6 -translate-y-1/2 items-center justify-center rounded-md border bg-background text-muted-foreground opacity-0 shadow-xs transition-opacity outline-none group-hover/cell:opacity-100 hover:text-foreground focus-visible:opacity-100 focus-visible:ring-3 focus-visible:ring-ring/50 [&_svg]:size-3.5"
      >
        {copied ? <CopyCheckIcon className="text-foreground" /> : <CopyIcon />}
      </TooltipTrigger>
      <TooltipContent>{copied ? "Copié" : "Copier"}</TooltipContent>
    </Tooltip>
  );
}

const STATUS = {
  active: ["Actif", "bg-emerald-500"],
  suspended: ["Suspendu", "bg-destructive"],
  staff: ["Équipe", "bg-violet-500"],
} as const;

export const STATUS_LABELS = Object.fromEntries(Object.entries(STATUS).map(([key, [label]]) => [key, label])) as Record<keyof typeof STATUS, string>;

/** A dot of colour and its label, lighter than a badge. */
export function StatusDot({ status }: { status: keyof typeof STATUS }) {
  const [label, color] = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 rounded-full", color)} aria-hidden />
      {label}
    </span>
  );
}

function IconBox({ label, children }: { label: string; children: ReactNode }) {
  return (
    <span role="img" aria-label={label} title={label} className="inline-flex size-6 shrink-0 items-center justify-center rounded-md bg-muted [&_svg]:size-3.5">
      {children}
    </span>
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

export function ConnectionIcons({ user }: { user: PocUser }) {
  const keys = connectionsOf(user);
  if (keys.length === 0) return <Empty />;
  return (
    <span className="flex items-center gap-1">
      {keys.map((key) => (
        <IconBox key={key} label={CONNECTIONS[key].label}>
          {CONNECTIONS[key].icon}
        </IconBox>
      ))}
    </span>
  );
}

const MAX_TAGS = 3;

/** The first tags, the others counted. */
export function UserTagIcons({ tags }: { tags: AdminUserTagLook[] }) {
  if (tags.length === 0) return <Empty />;
  const rest = tags.slice(MAX_TAGS);
  return (
    <span className="flex items-center gap-1">
      {tags.slice(0, MAX_TAGS).map((tag) => (
        <IconBox key={tag.id} label={tag.name}>
          <BadgeIcon icon={tag.icon} className={cn(!tag.color && "text-muted-foreground")} style={tag.color ? { color: tag.color } : undefined} aria-hidden />
        </IconBox>
      ))}
      {rest.length > 0 && (
        <span title={rest.map((tag) => tag.name).join(", ")} className="px-0.5 text-xs text-muted-foreground tabular-nums">
          +{rest.length}
        </span>
      )}
    </span>
  );
}

const CATEGORIES: Record<PocCategory, [string, string]> = {
  runner: ["Coureur", "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"],
  cyclist: ["Cycliste", "bg-sky-500/15 text-sky-700 dark:text-sky-300"],
  hiker: ["Randonneur", "bg-amber-500/15 text-amber-700 dark:text-amber-300"],
  swimmer: ["Nageur", "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300"],
  triathlete: ["Triathlète", "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300"],
};
const MAX_CATEGORIES = 2;

/** Coloured pills, the first ones shown, the others counted. */
export function CategoryPills({ categories }: { categories: PocCategory[] }) {
  if (categories.length === 0) return <Empty />;
  const rest = categories.slice(MAX_CATEGORIES);
  return (
    <span className="flex items-center gap-1">
      {categories.slice(0, MAX_CATEGORIES).map((category) => (
        <span key={category} className={cn("inline-flex h-5 items-center rounded-full px-2 text-xs font-medium", CATEGORIES[category][1])}>
          {CATEGORIES[category][0]}
        </span>
      ))}
      {rest.length > 0 && (
        <span title={rest.map((category) => CATEGORIES[category][0]).join(", ")} className="px-0.5 text-xs text-muted-foreground tabular-nums">
          +{rest.length}
        </span>
      )}
    </span>
  );
}

/** A missing value. */
export function Empty() {
  return <span className="text-muted-foreground/60">—</span>;
}

const dateTime = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Paris" });
const date = new Intl.DateTimeFormat("fr-FR", { dateStyle: "medium", timeZone: "Europe/Paris" });
const relative = new Intl.RelativeTimeFormat("fr-FR", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 86_400_000],
  ["month", 30 * 86_400_000],
  ["week", 7 * 86_400_000],
  ["day", 86_400_000],
  ["hour", 3_600_000],
  ["minute", 60_000],
];

export const formatDateTime = (iso: string) => dateTime.format(new Date(iso));
export const formatDate = (iso: string) => date.format(new Date(iso));

/** Relative, the exact date on hover. */
export function When({ iso }: { iso: string | null }) {
  if (!iso) return <Empty />;
  const elapsed = new Date(iso).getTime() - POC_NOW;
  const [unit, size] = UNITS.find(([, each]) => Math.abs(elapsed) >= each) ?? ["minute", 60_000];
  return (
    <time dateTime={iso} title={formatDateTime(iso)}>
      {relative.format(Math.round(elapsed / size), unit)}
    </time>
  );
}

const BYTE_UNITS = ["o", "Ko", "Mo", "Go", "To"];
const size = new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 1 });
export const formatNumber = new Intl.NumberFormat("fr-FR").format;

export function formatBytes(bytes: number): string {
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < BYTE_UNITS.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${size.format(value)} ${BYTE_UNITS[unit]}`;
}
