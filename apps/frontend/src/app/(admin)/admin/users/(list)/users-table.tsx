"use client";

import { type AdminUserSummary, highestAdminRole } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import {
  AtSignIcon,
  BanIcon,
  CalendarPlusIcon,
  CircleDotIcon,
  ClockIcon,
  CopyIcon,
  HashIcon,
  KeyRoundIcon,
  LayoutGridIcon,
  LinkIcon,
  MailIcon,
  PanelRightOpenIcon,
  ShieldIcon,
  TableIcon,
  TableOfContentsIcon,
  TagIcon,
  TypeIcon,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import {
  codeColumn,
  type DataTableConfig,
  DataTable,
  dateColumn,
  formatDate,
  type IconItem,
  IconsCell,
  iconsColumn,
  Mark,
  RowActions,
  statusColumn,
  textColumn,
  type Tone,
  Truncate,
  userColumn,
} from "@/components/admin/data-table";
import { GoogleIcon } from "@/components/auth/google-icon";
import { BadgeIcon } from "@/components/distances/badge-icon";
import { StravaIcon } from "@/components/strava/strava-icon";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/user/user-avatar";
import { publicNameOf } from "@/lib/user";
import { cn } from "@/lib/utils";
import { fetchUsersTable } from "../actions";

type Status = "active" | "suspended";

const STATUSES: Record<Status, { label: string; tone: Tone }> = {
  active: { label: "Actif", tone: "green" },
  suspended: { label: "Suspendu", tone: "red" },
};

const ROLES: Record<string, { label: string; tone: Tone }> = {
  support: { label: "Support", tone: "gray" },
  admin: { label: "Admin", tone: "blue" },
  "super-admin": { label: "Super-admin", tone: "violet" },
};

const CONNECTIONS = {
  strava: { label: "Strava", icon: <StravaIcon className="text-[#fc4c02]" /> },
  google: { label: "Google", icon: <GoogleIcon /> },
  password: { label: "E-mail et mot de passe", icon: <KeyRoundIcon className="text-muted-foreground" /> },
};

const statusOf = (user: AdminUserSummary): Status => (user.suspension ? "suspended" : "active");

function UserMarks({ user }: { user: AdminUserSummary }) {
  const role = highestAdminRole(user.roles);
  return (
    <>
      {role && <Mark {...ROLES[role]!} icon={<ShieldIcon />} />}
      {user.suspension && <Mark label={STATUSES.suspended.label} tone="red" icon={<BanIcon />} />}
    </>
  );
}

const connectionItems = (user: AdminUserSummary): IconItem[] =>
  [...(user.stravaConnected ? ["strava" as const] : []), ...user.signInMethods].map((key) => ({ key, ...CONNECTIONS[key] }));

const tagItems = (user: AdminUserSummary): IconItem[] =>
  user.userTags.map((tag) => ({
    key: tag.id,
    label: tag.name,
    icon: <BadgeIcon icon={tag.icon} className={cn(!tag.color && "text-muted-foreground")} style={tag.color ? { color: tag.color } : undefined} aria-hidden />,
  }));

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/**
 * The accounts; one opens in the panel above, at `<basePath>/<id>`, the list
 * keeping its picks in the URL.
 */
export function UsersTable({ basePath }: { basePath: string }) {
  const router = useRouter();
  const pathname = usePathname();

  // The panel changes accounts through Server Actions: the list fetches again once it closes.
  const onList = pathname === basePath;
  const [wasOnList, setWasOnList] = useState(onList);
  const [closings, setClosings] = useState(0);
  if (onList !== wasOnList) {
    setWasOnList(onList);
    if (onList) setClosings((count) => count + 1);
  }

  const config = useMemo<DataTableConfig<AdminUserSummary>>(() => {
    const open = (user: AdminUserSummary) => {
      const href = `${basePath}/${user.id}${window.location.search}`;
      // A new account replaces the one open, so that going back closes the panel.
      if (window.location.pathname.startsWith(`${basePath}/`)) router.replace(href, { scroll: false });
      else router.push(href, { scroll: false });
    };
    return {
      id: "users",
      fetch: (query: TableQuery) => fetchUsersTable(query),
      rowId: (user) => user.id,
      onOpen: open,
      muted: (user) => !!user.suspension,
      search: "Nom, @username, e-mail ou ID",
      noun: (count) => (count > 1 ? "comptes" : "compte"),
      empty: { title: "Aucun compte", description: "Les comptes apparaîtront ici dès la première inscription." },
      views: [
        { id: "table", label: "Tableau", icon: <TableIcon /> },
        { id: "overview", label: "Aperçu", icon: <TableOfContentsIcon />, columns: ["user", "status", "lastSeenAt", "connections"] },
        { id: "cards", label: "Cartes", icon: <LayoutGridIcon />, cards: true },
      ],
      columns: [
        userColumn({ id: "user", header: "Utilisateur", icon: <AtSignIcon />, sortable: true, value: (user) => user, marks: (user) => <UserMarks user={user} /> }),
        textColumn({ id: "displayName", header: "Nom affiché", icon: <TypeIcon />, sortable: true, value: (user) => user.displayName, width: "max-w-44" }),
        statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, value: statusOf, statuses: STATUSES }),
        textColumn({ id: "email", header: "E-mail", icon: <MailIcon />, value: (user) => user.email, muted: true, width: "max-w-52" }),
        dateColumn({ id: "createdAt", header: "Inscription", icon: <CalendarPlusIcon />, sortable: true, value: (user) => user.createdAt }),
        dateColumn({ id: "lastSeenAt", header: "Dernière visite", icon: <ClockIcon />, sortable: true, value: (user) => user.lastSeenAt, relative: true }),
        iconsColumn({ id: "connections", header: "Connexions", icon: <LinkIcon />, value: connectionItems }),
        iconsColumn({ id: "userTags", header: "Tags", icon: <TagIcon />, sortable: true, value: tagItems }),
        codeColumn({ id: "id", header: "ID", icon: <HashIcon />, value: (user) => user.id, width: "max-w-20" }),
      ],
      facets: [
        { id: "status", label: "Statut", options: Object.entries(STATUSES).map(([value, { label }]) => ({ value, label })) },
        {
          id: "role",
          label: "Rôle",
          options: [...Object.entries(ROLES).map(([value, { label }]) => ({ value, label })), { value: "none", label: "Sans rôle" }],
        },
        { id: "connections", label: "Connexion", options: Object.entries(CONNECTIONS).map(([value, { label, icon }]) => ({ value, label, icon })) },
      ],
      groupings: [
        { id: "status", label: "Statut", title: (key) => STATUSES[key as Status].label },
        { id: "role", label: "Rôle", title: (key) => ROLES[key]?.label ?? "Sans rôle" },
      ],
      card: (user) => (
        <button
          type="button"
          onClick={() => open(user)}
          className="flex w-full items-center gap-2.5 rounded-xl border bg-card px-3 py-2 text-left transition-colors hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
        >
          <UserAvatar user={user} className="size-9" />
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="flex items-center gap-1.5">
              <Truncate className="text-sm font-medium">{publicNameOf(user)}</Truncate>
              <UserMarks user={user} />
              <span className="ml-auto shrink-0 pl-1">
                <IconsCell items={connectionItems(user)} />
              </span>
            </span>
            <span className="truncate text-xs text-muted-foreground">
              @{user.username} • {formatDate(user.createdAt)}
            </span>
          </span>
        </button>
      ),
      actions: (user) => (
        <RowActions label={`Actions de @${user.username}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => open(user)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => copy(user.id, "ID copié")}>
              <CopyIcon />
              Copier l&apos;ID
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => copy(user.email, "E-mail copié")}>
              <MailIcon />
              Copier l&apos;e-mail
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </RowActions>
      ),
    };
    // `closings` gives a new source, fetched again, each time the panel closes.
  }, [router, basePath, closings]);

  return <DataTable config={config} />;
}
