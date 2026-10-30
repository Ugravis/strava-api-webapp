"use client";

import { type AdminUserSummary, type AdminUserTagLook, highestAdminRole } from "@kilotrace/shared/admin";
import type { TableQuery } from "@kilotrace/shared/table";
import {
  ActivityIcon,
  AtSignIcon,
  BanIcon,
  CalendarPlusIcon,
  CircleDotIcon,
  ClockIcon,
  CopyIcon,
  HashIcon,
  ExternalLinkIcon,
  KeyRoundIcon,
  LinkIcon,
  ListClockIcon,
  MailIcon,
  PanelRightOpenIcon,
  ShieldIcon,
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
  type IconItem,
  iconsColumn,
  Mark,
  numberColumn,
  RowActions,
  statusColumn,
  textColumn,
  type Tone,
  userColumn,
} from "@/components/admin/data-table";
import { GoogleIcon } from "@/components/auth/google-icon";
import { BadgeIcon } from "@/components/distances/badge-icon";
import { StravaIcon } from "@/components/strava/strava-icon";
import { DropdownMenuGroup, DropdownMenuItem, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { userProfileHref } from "@/config/routes";
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

function UserTagIcon({ tag }: { tag: AdminUserTagLook }) {
  return <BadgeIcon icon={tag.icon} className={cn(!tag.color && "text-muted-foreground")} style={tag.color ? { color: tag.color } : undefined} aria-hidden />;
}

const tagItems = (user: AdminUserSummary): IconItem[] => user.userTags.map((tag) => ({ key: tag.id, label: tag.name, icon: <UserTagIcon tag={tag} /> }));

/** Key of the facet and of the group of the accounts without any tag. */
const NO_TAG = "none";

function copy(text: string, done: string) {
  navigator.clipboard.writeText(text).then(() => toast.success(done), () => toast.error("Copie impossible"));
}

/**
 * The accounts; one opens in the panel above, at `<basePath>/<id>`, the list
 * keeping its picks in the URL. `tags` is the catalog, in its order.
 */
export function UsersTable({ basePath, auditLogPath, tags }: { basePath: string; auditLogPath: string; tags: AdminUserTagLook[] }) {
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
      defaultSort: { id: "createdAt", desc: true },
      views: [
        { id: "cards", label: "Cartes", layout: "cards", columns: ["user", "createdAt", "lastSeenAt"] },
        { id: "compact", label: "Table compacte", columns: ["user", "createdAt", "lastSeenAt", "userTags", "activities"] },
        {
          id: "detailed",
          label: "Table détaillée",
          columns: ["user", "displayName", "status", "email", "createdAt", "lastSeenAt", "connections", "userTags", "activities", "id"],
        },
      ],
      columns: [
        userColumn({ id: "user", header: "Utilisateur", icon: <AtSignIcon />, sortable: true, value: (user) => user, marks: (user) => <UserMarks user={user} /> }),
        textColumn({ id: "displayName", header: "Nom affiché", icon: <TypeIcon />, sortable: true, value: (user) => user.displayName, width: "max-w-44" }),
        statusColumn({ id: "status", header: "Statut", icon: <CircleDotIcon />, sortable: true, value: statusOf, statuses: STATUSES }),
        textColumn({ id: "email", header: "E-mail", icon: <MailIcon />, sortable: true, value: (user) => user.email, muted: true, width: "max-w-52" }),
        dateColumn({ id: "createdAt", header: "Inscription", icon: <CalendarPlusIcon />, sortable: true, value: (user) => user.createdAt }),
        dateColumn({ id: "lastSeenAt", header: "Dernière visite", icon: <ClockIcon />, sortable: true, value: (user) => user.lastSeenAt, relative: true }),
        iconsColumn({ id: "connections", header: "Connexions", icon: <LinkIcon />, sortable: true, value: connectionItems }),
        iconsColumn({ id: "userTags", header: "Tags", icon: <TagIcon />, sortable: true, value: tagItems }),
        numberColumn({ id: "activities", header: "Activités", icon: <ActivityIcon />, sortable: true, value: (user) => user.activitiesCount }),
        codeColumn({ id: "id", header: "ID", icon: <HashIcon />, sortable: true, value: (user) => user.id, width: "max-w-20" }),
      ],
      facets: [
        { id: "connections", label: "Connexion", options: Object.entries(CONNECTIONS).map(([value, { label, icon }]) => ({ value, label, icon })) },
        {
          id: "userTags",
          label: "Tags",
          options: [...tags.map((tag) => ({ value: tag.id, label: tag.name, icon: <UserTagIcon tag={tag} /> })), { value: NO_TAG, label: "Sans tag" }],
        },
      ],
      groupings: [
        { id: "status", label: "Statut", title: (key) => STATUSES[key as Status].label },
        { id: "role", label: "Rôle", title: (key) => ROLES[key]?.label ?? "Sans rôle" },
        {
          // By the first tag of the account, in the order of the catalog.
          id: "userTags",
          label: "Tag principal",
          title: (key) => {
            const tag = tags.find((each) => each.id === key);
            return tag ? (
              <span className="inline-flex items-center gap-1.5">
                <UserTagIcon tag={tag} />
                {tag.name}
              </span>
            ) : (
              "Sans tag"
            );
          },
        },
      ],
      actions: (user) => (
        <RowActions label={`Actions de @${user.username}`}>
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => open(user)}>
              <PanelRightOpenIcon />
              Ouvrir la fiche
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => window.open(userProfileHref(user.username), "_blank", "noopener")}>
              <ExternalLinkIcon />
              Voir le profil public
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push(`${auditLogPath}?target=${user.id}`)}>
              <ListClockIcon />
              Voir le journal
            </DropdownMenuItem>
          </DropdownMenuGroup>
          <DropdownMenuSeparator />
          <DropdownMenuGroup>
            <DropdownMenuItem onClick={() => copy(user.id, "ID copié")}>
              <CopyIcon />
              Copier l&apos;ID
            </DropdownMenuItem>
          </DropdownMenuGroup>
        </RowActions>
      ),
    };
    // `closings` gives a new source, fetched again, each time the panel closes.
  }, [router, basePath, auditLogPath, tags, closings]);

  return <DataTable config={config} />;
}
