"use client";

import type { AdminPermission, AdminUserDetail, AdminUserSummary, ModeratableField } from "@kilotrace/shared/admin";
import {
  AtSignIcon,
  CalendarIcon,
  CalendarClockIcon,
  CircleCheckIcon,
  CircleXIcon,
  EyeIcon,
  ExternalLinkIcon,
  FileTextIcon,
  GlobeIcon,
  KeyRoundIcon,
  MapPinIcon,
  PanelRightOpenIcon,
  GavelIcon,
  TagIcon,
  RefreshCwIcon,
  StickyNoteIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
} from "lucide-react";
import Link from "next/link";
import { formatDateTime, formatRelative } from "@/components/admin/data-table";
import {
  DetailAction,
  DetailActions,
  DetailColumnField,
  DetailCover,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailLoader,
  DetailSection,
  DetailHistory,
  DetailItem,
  DetailItemButton,
  DetailItems,
  DetailSkeleton,
  type RowPanelControls,
} from "@/components/admin/detail";
import { useSplitPanel } from "@/components/split-panel";
import { UserAvatar } from "@/components/user/user-avatar";
import { userProfileHref } from "@/config/routes";
import { countryName } from "@/lib/countries/country-format";
import { publicNameOf } from "@/lib/user";
import { loadUserDetail, loadUserHistory, type UserDetailData } from "./actions";
import type { ActRefusal } from "@/lib/admin/permissions";
import { moderateTool, NOT_GRANTED, type UserActionKey, useUserActionDialog, userActionsOf } from "./user-actions";
import { useOpenTag } from "./use-user-panel";
import { tagsEdit, userColumns, UserMarks, UserTagIcon } from "./user-columns";
import { useUsersVersion } from "./users-store";

/** The account loaded by the panel, its skeleton meanwhile; loaded again after every change. `panel` when opened from its table; else (from the audit log) a deletion closes the panel. */
export function UserRowPanel({ id, panel }: { id: string; panel?: RowPanelControls }) {
  const version = useUsersVersion();
  return (
    <DetailLoader id={id} load={loadUserDetail} refreshKey={version} skeleton={<DetailSkeleton cover media actions={4} sections={[7, 7, 5, 2, 4, 3]} />}>
      {(data) => <UserDetail data={data} panel={panel} version={version} />}
    </DetailLoader>
  );
}

/** Everything the back office shows of an account, and its actions, locked with their reason when the role does not grant them. */
function UserDetail({ data: { user, permissions, refusal, catalog, historyHref }, panel, version }: { data: UserDetailData; panel?: RowPanelControls; version: number }) {
  const { close } = useSplitPanel();
  const openTag = useOpenTag();
  const { openAction, dialog } = useUserActionDialog((id) => (panel ? panel.removed(id) : close()));
  const tags = tagsEdit(user, catalog, permissions.includes("users.userTags") ? null : NOT_GRANTED);
  const columns = userColumns({ moderate: (each, target) => moderateTool(each, target, permissions, refusal, openAction) });
  const field = (id: string) => <DetailColumnField row={user} columns={columns} id={id} />;
  const actions = userActionsOf(user, permissions, refusal);

  return (
    <>
      <DetailCover image={user.avatarUrl ? { src: user.avatarUrl, alt: `Photo de @${user.username}` } : null} />
      <DetailHeader
        media={<UserAvatar user={user} className="size-12" />}
        title={publicNameOf(user)}
        subtitle={`@${user.username}`}
        marks={<UserMarks user={user} />}
        actions={<DetailAction label="Voir le profil public" icon={<ExternalLinkIcon aria-hidden />} href={userProfileHref(user.username)} />}
      />
      <DetailActions>
        {actions.map((action) => (
          <DetailAction
            key={action.key}
            label={action.label}
            icon={action.icon}
            variant={action.destructive ? "destructive" : "outline"}
            locked={action.locked}
            onClick={() => openAction(user, action.key)}
          />
        ))}
      </DetailActions>
      {dialog}

      {user.suspension && (
        <DetailSection title="Suspension" tone="danger">
          <DetailFields>
            <DetailField label="Depuis" icon={<CalendarIcon />}>
              {formatDateTime(user.suspension.since)}
            </DetailField>
            <DetailField label="Jusqu'au" icon={<CalendarClockIcon />}>
              {user.suspension.until ? formatDateTime(user.suspension.until) : "Durée indéterminée"}
            </DetailField>
            <DetailField label="Raison" icon={<StickyNoteIcon />} copy={user.suspension.reason} stacked>
              <span className="whitespace-pre-line">{user.suspension.reason}</span>
            </DetailField>
          </DetailFields>
        </DetailSection>
      )}

      <UserProfileSection user={user} permissions={permissions} refusal={refusal} openAction={openAction} />

      <DetailSection title="Compte">
        <DetailFields>
          {field("status")}
          {field("roles")}
          <DetailField label="Tags" icon={<TagIcon />} edit={tags} copy={user.userTags.map((tag) => tag.name).join(", ") || null}>
            {user.userTags.length > 0 && (
              <DetailItems>
                {user.userTags.map((tag) => (
                  <DetailItem
                    key={tag.id}
                    pill
                    floating
                    icon={<UserTagIcon tag={tag} />}
                    actions={
                      <DetailItemButton label={`Ouvrir le tag ${tag.name}`} modifies={false} onClick={() => openTag(tag)}>
                        <PanelRightOpenIcon aria-hidden />
                      </DetailItemButton>
                    }
                  >
                    {tag.name}
                  </DetailItem>
                ))}
              </DetailItems>
            )}
          </DetailField>
          {field("email")}
          {field("createdAt")}
          {field("lastSeenAt")}
          <DetailField label="Sessions actives" icon={<KeyRoundIcon />}>
            {user.sessionsCount}
          </DetailField>
          {field("id")}
        </DetailFields>
      </DetailSection>

      <DetailSection title="Connexions">
        <DetailFields>
          {field("connections")}
          {field("activities")}
          <DetailField label="Compte Strava" icon={<UserCheckIcon />}>
            {user.strava ? user.strava.accountName : "Aucun compte Strava lié"}
          </DetailField>
          {user.strava && (
            <>
              <DetailField label="Lié le" icon={<CalendarIcon />}>
                {formatDateTime(user.strava.connectedAt)}
              </DetailField>
              <DetailField label="Dernière synchro" icon={<RefreshCwIcon />} copy={user.strava.lastSyncedAt && formatDateTime(user.strava.lastSyncedAt)}>
                {user.strava.lastSyncedAt && (
                  <time dateTime={user.strava.lastSyncedAt} title={formatDateTime(user.strava.lastSyncedAt)}>
                    {formatRelative(user.strava.lastSyncedAt)}
                  </time>
                )}
              </DetailField>
            </>
          )}
        </DetailFields>
      </DetailSection>

      <DetailSection title="Communauté">
        <DetailFields>
          <DetailField label="Abonnés" icon={<UsersIcon />}>
            {user.followersCount}
          </DetailField>
          <DetailField label="Abonnements" icon={<UserPlusIcon />}>
            {user.followingCount}
          </DetailField>
        </DetailFields>
      </DetailSection>

      <DetailSection
        title="Historique"
        aside={
          <Link href={historyHref} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
            Dans le journal
          </Link>
        }
      >
        <DetailHistory
          refreshKey={version}
          empty="Aucune action sur ce compte."
          load={(cursor) =>
            loadUserHistory(user.id, cursor).then(({ entries, next, total }) => ({
              next,
              total,
              events: entries.map((entry) => ({
                id: entry.id,
                icon: entry.succeeded ? <CircleCheckIcon /> : <CircleXIcon />,
                tone: entry.succeeded ? "default" : "red",
                title: entry.label,
                date: entry.createdAt,
                details: (entry.actor || entry.reason) && (
                  <>
                    {entry.actor && <span className="block">par {entry.actor.displayName ?? entry.actor.username ?? "—"}</span>}
                    {entry.reason && <span className="block">« {entry.reason} »</span>}
                  </>
                ),
              })),
            }))
          }
        />
      </DetailSection>
    </>
  );
}

/**
 * The only free texts of an account, what moderation is about: each holding a
 * value has a gavel opening the moderation with it checked, none when the
 * member may not. In the detail of an account and of a report on it.
 */
export function UserProfileSection({
  user,
  permissions,
  refusal,
  openAction,
}: {
  user: AdminUserDetail;
  permissions: AdminPermission[];
  refusal: ActRefusal | null;
  openAction: (user: AdminUserSummary, action: UserActionKey, fields?: ModeratableField[]) => void;
}) {
  const moderate = (target: ModeratableField, shown: unknown) => !!shown && moderateTool(user, target, permissions, refusal, openAction);
  const columns = userColumns({ moderate: (each, target) => moderateTool(each, target, permissions, refusal, openAction) });
  const field = (id: string) => <DetailColumnField row={user} columns={columns} id={id} />;
  return (
    <DetailSection title="Profil" pill={{ icon: <GavelIcon />, label: "Modération", tone: "amber" }}>
      <DetailFields>
        {field("avatar")}
        {field("displayName")}
        <DetailField label="Pseudo" icon={<AtSignIcon />} copy={user.username} tools={moderate("username", user.username)}>
          @{user.username}
        </DetailField>
        <DetailField label="Bio" icon={<FileTextIcon />} copy={user.bio} stacked={!!user.bio} tools={moderate("bio", user.bio)}>
          {user.bio && <span className="whitespace-pre-line">{user.bio}</span>}
        </DetailField>
        <DetailField label="Ville" icon={<MapPinIcon />} tools={moderate("city", user.city)}>
          {user.city}
        </DetailField>
        <DetailField label="Pays" icon={<GlobeIcon />} tools={moderate("city", user.countryCode)}>
          {user.countryCode && countryName(user.countryCode, "fr")}
        </DetailField>
        <DetailField label="Visibilité" icon={<EyeIcon />}>
          {user.profilePrivate ? "Privé" : "Public"}
        </DetailField>
      </DetailFields>
    </DetailSection>
  );
}
