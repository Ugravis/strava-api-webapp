"use client";

import type { ReactNode } from "react";
import { UserAvatar } from "@/components/user/user-avatar";
import { cn } from "@/lib/utils";
import { EmptyValue, IconBox, MoreCount, Truncate } from "./base";

/** The colours of the marks, the same in every table. */
export type Tone = "gray" | "green" | "red" | "amber" | "blue" | "violet" | "sky" | "cyan" | "fuchsia";

const DOTS: Record<Tone, string> = {
  gray: "bg-muted-foreground/60",
  green: "bg-emerald-500",
  red: "bg-destructive",
  amber: "bg-amber-500",
  blue: "bg-blue-500",
  violet: "bg-violet-500",
  sky: "bg-sky-500",
  cyan: "bg-cyan-500",
  fuchsia: "bg-fuchsia-500",
};

const PILLS: Record<Tone, string> = {
  gray: "bg-muted text-muted-foreground",
  green: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  red: "bg-destructive/15 text-destructive",
  amber: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  blue: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  violet: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  sky: "bg-sky-500/15 text-sky-700 dark:text-sky-300",
  cyan: "bg-cyan-500/15 text-cyan-700 dark:text-cyan-300",
  fuchsia: "bg-fuchsia-500/15 text-fuchsia-700 dark:text-fuchsia-300",
};

/** A state among a few: a dot of colour and its label, lighter than a badge. */
export function StatusCell({ label, tone }: { label: string; tone: Tone }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={cn("size-1.5 shrink-0 rounded-full", DOTS[tone])} aria-hidden />
      {label}
    </span>
  );
}

export interface Pill {
  label: string;
  tone: Tone;
}

/** Labels among many, e.g. categories: coloured pills, the first ones shown, the others counted. */
export function PillsCell({ items, max = 2 }: { items: Pill[]; max?: number }) {
  if (items.length === 0) return <EmptyValue />;
  return (
    <span className="flex items-center gap-1">
      {items.slice(0, max).map((item) => (
        <span key={item.label} className={cn("inline-flex h-5 shrink-0 items-center rounded-full px-2 text-xs font-medium", PILLS[item.tone])}>
          {item.label}
        </span>
      ))}
      <MoreCount names={items.slice(max).map((item) => item.label)} />
    </span>
  );
}

export interface IconItem {
  key: string;
  label: string;
  icon: ReactNode;
}

/** Things told by their icon, e.g. connections or tags: the first ones shown, the others counted. */
export function IconsCell({ items, max = 3 }: { items: IconItem[]; max?: number }) {
  if (items.length === 0) return <EmptyValue />;
  return (
    <span className="flex items-center gap-1">
      {items.slice(0, max).map((item) => (
        <IconBox key={item.key} label={item.label}>
          {item.icon}
        </IconBox>
      ))}
      <MoreCount names={items.slice(max).map((item) => item.label)} />
    </span>
  );
}

/** A small round icon in a pill, beside a name: a role, a suspension. */
export function Mark({ label, tone, icon }: { label: string; tone: Tone; icon: ReactNode }) {
  return (
    <span role="img" aria-label={label} title={label} className={cn("inline-flex h-4 shrink-0 items-center rounded-full px-1 [&_svg]:size-2.5", PILLS[tone])}>
      {icon}
    </span>
  );
}

/** An account as the API names it: no username once deleted. */
export interface CellUser {
  username: string | null;
  displayName: string | null;
  avatarUrl: string | null;
}

/**
 * An account: avatar, @username and its marks, on a single line. No account
 * shows `empty`, e.g. « Système », else a dash; a deleted one says so.
 */
export function UserCell({
  user,
  marks,
  empty,
  avatar = true,
}: {
  user: CellUser | null;
  /** `Mark`s after the name. */
  marks?: ReactNode;
  empty?: string;
  /** Without the avatar, e.g. shown by an image column of its own. */
  avatar?: boolean;
}) {
  if (!user) return empty ? <span className="text-muted-foreground">{empty}</span> : <EmptyValue />;
  if (!user.username) return <span className="text-muted-foreground italic">Compte supprimé</span>;
  return (
    <span className="flex max-w-40 items-center gap-2 sm:max-w-56">
      {avatar && <UserAvatar user={{ ...user, username: user.username }} className="size-5" fallbackClassName="text-[9px]" />}
      <Truncate className="font-medium text-foreground">@{user.username}</Truncate>
      {marks}
    </span>
  );
}

export interface Look {
  /** The icon, drawn in a disc. */
  icon: ReactNode;
  name: string;
  /** `#rrggbb` filling the disc; the icon takes black or white, whichever reads better. */
  background?: string | null;
  /** `#rrggbb` of the icon, on the default disc. */
  color?: string | null;
}

/** An item told by its look, e.g. a badge or a tag: its icon in a disc, then its name, on a single line. */
export function LookCell({ look, marks }: { look: Look; marks?: ReactNode }) {
  const style = look.background ? { backgroundColor: look.background, color: textOn(look.background) } : look.color ? { color: look.color } : undefined;
  return (
    <span className="flex max-w-48 items-center gap-2 sm:max-w-64">
      <span className="inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-3.5" style={style} aria-hidden>
        {look.icon}
      </span>
      <Truncate className="font-medium text-foreground">{look.name}</Truncate>
      {marks}
    </span>
  );
}

/** Black or white, whichever reads better on the colour. */
function textOn(hex: string): string {
  const [r, g, b] = [1, 3, 5].map((start) => Number.parseInt(hex.slice(start, start + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#000" : "#fff";
}
