"use client";

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
  EraserIcon,
  PlusIcon,
  RefreshCwIcon,
  StickyNoteIcon,
  UserCheckIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { formatDateTime, formatRelative } from "@/components/admin/data-table";
import {
  DetailAction,
  DetailActions,
  DetailColumnField,
  DetailCover,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailItem,
  DetailItemButton,
  DetailItems,
  DetailLoader,
  DetailSection,
  DetailSkeleton,
  DetailTimeline,
  DetailTimelineItem,
} from "@/components/admin/detail";
import { UserAvatar } from "@/components/user/user-avatar";
import { userProfileHref } from "@/config/routes";
import { countryName } from "@/lib/countries/country-format";
import { publicNameOf } from "@/lib/user";
import { loadUserDetail, setUserTag, type UserDetailData } from "./actions";
import { useUserActionDialog, userActionsOf } from "./user-actions";
import { USER_COLUMNS, UserMarks, UserTagIcon } from "./user-columns";
import { bumpUsers, useUsersVersion } from "./users-store";

const REFUSALS = {
  self: "C'est votre compte : les actions sont désactivées.",
  protected: "Membre de l'équipe de rang égal ou supérieur : les actions sont désactivées.",
  readOnly: "Lecture seule : votre rôle n'a la permission d'aucune action sur les comptes.",
};

/** The account loaded by the panel, its skeleton meanwhile; loaded again after every change. */
export function UserRowPanel({ id }: { id: string }) {
  const version = useUsersVersion();
  return (
    <DetailLoader id={id} load={loadUserDetail} refreshKey={version} skeleton={<DetailSkeleton cover actions={4} sections={[7, 7, 5, 2]} />}>
      {(data) => <UserDetail data={data} />}
    </DetailLoader>
  );
}

/** Everything the back office shows of an account, and the actions the role grants on it. */
function UserDetail({ data: { user, permissions, refusal, catalog, history } }: { data: UserDetailData }) {
  const { openAction, dialog } = useUserActionDialog();
  const [pending, setPending] = useState<string | null>(null);
  const toggleTag = async (tagId: string, granted: boolean) => {
    setPending(tagId);
    const result = await setUserTag(user.id, tagId, granted).catch(() => ({ ok: false, message: "L'API n'a pas répondu." }));
    setPending(null);
    if (!result.ok) return toast.error(result.message);
    toast.success(result.message);
    bumpUsers();
  };
  const field = (id: string) => <DetailColumnField row={user} columns={USER_COLUMNS} id={id} />;

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
        {refusal ? (
          <p className="min-w-0 text-sm text-muted-foreground">{REFUSALS[refusal]}</p>
        ) : (
          userActionsOf(user, permissions).map((action) => (
            <DetailAction
              key={action.key}
              label={action.label}
              icon={action.icon}
              variant={action.destructive ? "destructive" : "outline"}
              onClick={() => openAction(user, action.key)}
            />
          ))
        )}
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

      {/* The only free texts of the account: what moderation is about. */}
      <DetailSection title="Profil" pill={{ icon: <EraserIcon />, label: "Modération", tone: "amber" }}>
        <DetailFields>
          {field("avatar")}
          {field("displayName")}
          <DetailField label="Pseudo" icon={<AtSignIcon />} copy={user.username}>
            @{user.username}
          </DetailField>
          <DetailField label="Bio" icon={<FileTextIcon />} copy={user.bio} stacked={!!user.bio}>
            {user.bio && <span className="whitespace-pre-line">{user.bio}</span>}
          </DetailField>
          <DetailField label="Ville" icon={<MapPinIcon />}>
            {user.city}
          </DetailField>
          <DetailField label="Pays" icon={<GlobeIcon />}>
            {user.countryCode && countryName(user.countryCode, "fr")}
          </DetailField>
          <DetailField label="Visibilité" icon={<EyeIcon />}>
            {user.profilePrivate ? "Privé" : "Public"}
          </DetailField>
        </DetailFields>
      </DetailSection>

      <DetailSection title="Compte">
        <DetailFields>
          {field("status")}
          {field("roles")}
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
      <DetailSection title="Tags">
        <DetailItems>
          {catalog.map((tag) => {
            const held = user.userTags.find((each) => each.id === tag.id);
            return (
              <DetailItem
                key={tag.id}
                icon={<UserTagIcon tag={tag} />}
                actions={
                  permissions.includes("users.userTags") &&
                  (held ? (
                    <DetailItemButton label={`Retirer ${tag.name}`} disabled={pending === tag.id} onClick={() => toggleTag(tag.id, false)}>
                      <XIcon />
                    </DetailItemButton>
                  ) : (
                    <DetailItemButton label={`Attribuer ${tag.name}`} disabled={pending === tag.id} onClick={() => toggleTag(tag.id, true)}>
                      <PlusIcon />
                    </DetailItemButton>
                  ))
                }
              >
                <span className={held ? undefined : "text-muted-foreground"}>{tag.name}</span>
              </DetailItem>
            );
          })}
        </DetailItems>
      </DetailSection>

      <DetailSection
        title="Historique"
        aside={
          history.total > 0 && (
            <Link href={history.href} className="text-xs font-medium text-primary underline-offset-4 hover:underline">
              Tout l&apos;historique
            </Link>
          )
        }
      >
        {history.entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucune action sur ce compte.</p>
        ) : (
          <DetailTimeline>
            {history.entries.map((entry) => (
              <DetailTimelineItem
                key={entry.id}
                icon={entry.succeeded ? <CircleCheckIcon /> : <CircleXIcon />}
                tone={entry.succeeded ? "default" : "red"}
                title={entry.label}
                date={entry.createdAt}
              >
                {entry.actor && <span className="block">par {entry.actor.displayName ?? entry.actor.username ?? "—"}</span>}
                {entry.reason && <span className="block">« {entry.reason} »</span>}
              </DetailTimelineItem>
            ))}
          </DetailTimeline>
        )}
      </DetailSection>
    </>
  );
}
