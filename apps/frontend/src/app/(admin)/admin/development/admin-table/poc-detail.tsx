"use client";

import {
  ActivityIcon,
  BanIcon,
  CircleCheckIcon,
  GlobeIcon,
  HistoryIcon,
  KeyRoundIcon,
  LinkIcon,
  LogInIcon,
  MailIcon,
  NotebookTextIcon,
  PencilIcon,
  StickyNoteIcon,
  TagIcon,
  Trash2Icon,
  TypeIcon,
  UnlinkIcon,
  UserIcon,
  UserPlusIcon,
  UsersIcon,
  XIcon,
} from "lucide-react";
import type { ReactNode } from "react";
import { toast } from "sonner";
import {
  DetailAction,
  DetailActions,
  DetailColumnField,
  DetailColumnFields,
  DetailCover,
  DetailFieldButton,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailHistory,
  DetailItem,
  DetailItemButton,
  DetailItems,
  DetailLoader,
  DetailSkeleton,
  DetailSection,
  DetailTabs,
  fromRule,
  type RowPanelControls,
} from "@/components/admin/detail";
import { useSplitPanel } from "@/components/split-panel";
import { UserAvatar } from "@/components/user/user-avatar";
import { USERS } from "./poc-columns";
import type { PocUser } from "./poc-data";
import { CONNECTIONS, connectionsOf, tagItems, UserMarks } from "./poc-marks";
import { USER_RULES } from "./poc-rules";
import { loadPocUser, loadPocUserHistory, type PocEvent, pocLock, removePocUsers, savePocUser, searchPocUsers, suspendPocUsers, usePocSettings, usePocVersion } from "./poc-store";

/** Every action of the demo only says what it would do. */
const would = (what: string) => () => toast(`Ouvrirait : ${what}`);

/**
 * The account loaded by the panel, its skeleton meanwhile; loaded again once
 * saved. `panel` when opened from its table, so that a removal follows the
 * choice of the simulation; else (from a badge) the panel closes.
 */
export function PocUserPanel({ id, panel }: { id: string; panel?: RowPanelControls }) {
  const version = usePocVersion();
  return (
    <DetailLoader id={id} load={loadPocUser} refreshKey={version} skeleton={<DetailSkeleton cover actions={3} sections={[6, 4, 2]} />}>
      {(user) => <PocUserDetail user={user} panel={panel} version={version} />}
    </DetailLoader>
  );
}

const EVENT_LOOKS: Record<PocEvent["kind"], { icon: ReactNode; tone: "default" | "green" | "red" | "amber" | "blue" }> = {
  signup: { icon: <UserPlusIcon />, tone: "green" },
  seen: { icon: <LogInIcon />, tone: "default" },
  tag: { icon: <TagIcon />, tone: "blue" },
  suspend: { icon: <BanIcon />, tone: "amber" },
  action: { icon: <CircleCheckIcon />, tone: "default" },
  edit: { icon: <PencilIcon />, tone: "blue" },
};

/** What the detail panel shows of a fake account, in tabs, with the cells of its table: the content only, the panel is the layout's. */
export function PocUserDetail({ user, panel, version }: { user: PocUser; panel?: RowPanelControls; version: number }) {
  const connections = connectionsOf(user);
  const { close } = useSplitPanel();
  // Read for the locks: a change of role draws the detail again.
  usePocSettings();
  const locked = pocLock();
  const save = (patch: Parameters<typeof savePocUser>[1]) => savePocUser(user.id, patch);

  return (
    <>
      <DetailCover image={user.cover} />
      <DetailHeader media={<UserAvatar user={user} className="size-12" />} title={user.displayName ?? `@${user.username}`} subtitle={`@${user.username}`} marks={<UserMarks user={user} />} />
      {/* A row of buttons right under the header: asking first when they cannot be undone. */}
      <DetailActions>
        <DetailAction label="Écrire" icon={<MailIcon aria-hidden />} onClick={would("un e-mail")} />
        <DetailAction
          label="Suspendre"
          icon={<BanIcon aria-hidden />}
          variant="destructive"
          confirm={{
            title: `Suspendre @${user.username} ?`,
            description: "Le compte ne peut plus se connecter et n'apparaît plus sur le site.",
            confirmLabel: "Suspendre",
            reason: { label: "Motif", placeholder: "Gardé dans l'historique du compte", required: true },
          }}
          onClick={(reason) => suspendPocUsers([user.id], reason)}
        />
        <DetailAction
          label="Supprimer"
          icon={<Trash2Icon aria-hidden />}
          variant="destructive"
          locked={locked}
          confirm={{ title: `Supprimer @${user.username} ?`, description: "Le compte, ses activités et ses badges sont effacés. Cette suppression est définitive.", confirmLabel: "Supprimer le compte" }}
          onClick={async () => {
            const outcome = await removePocUsers([user.id]);
            if (outcome.ok) (panel ? panel.removed(user.id) : close());
            return outcome;
          }}
        />
      </DetailActions>
      {user.status === "suspended" && (
        <DetailSection title="Suspension" tone="danger">
          <p className="text-sm">Compte suspendu : il ne peut plus se connecter et n&apos;apparaît plus sur le site.</p>
        </DetailSection>
      )}
      <DetailTabs
        tabs={[
          {
            id: "profile",
            label: "Profil",
            icon: <UserIcon />,
            content: (
              <>
                <DetailSection title="Compte">
                  <DetailFields>
                    {/* Edited in place, following the shared rules of an account. */}
                    <DetailField
                      label="Nom affiché"
                      icon={<TypeIcon />}
                      edit={{ ...fromRule(USER_RULES.displayName), value: user.displayName, placeholder: "Aucun", onSave: (displayName) => save({ displayName }) }}
                    />
                    {/* An address, refused malformed; a button of its own before copy and edit. */}
                    <DetailField
                      label="E-mail"
                      icon={<MailIcon />}
                      tools={
                        <DetailFieldButton label="Écrire à cette adresse" onClick={would(`un e-mail à ${user.email}`)}>
                          <MailIcon />
                        </DetailFieldButton>
                      }
                      edit={{ kind: "email", ...fromRule(USER_RULES.email), value: user.email, onSave: (email) => save({ email: email ?? "" }) }}
                    />
                  </DetailFields>
                  <DetailColumnFields row={user} columns={USERS.columns} ids={["status", "cover", "createdAt", "lastSeenAt"]} />
                </DetailSection>
                <DetailSection title="Profil">
                  <DetailFields>
                    <DetailField label="Site web" icon={<GlobeIcon />} edit={{ kind: "url", ...fromRule(USER_RULES.website), value: user.website, placeholder: "https://", onSave: (website) => save({ website }) }} />
                    {/* Another account, searched on the server; « erreur » fails, to see it told. */}
                    <DetailField
                      label="Parrain"
                      icon={<UsersIcon />}
                      edit={{ kind: "relation", value: user.referrer, search: searchPocUsers, noneLabel: "Aucun", placeholder: "Nom ou @username", onSave: (referrer) => save({ referrer: referrer as PocUser["referrer"] }) }}
                    />
                    {/* Free values, edited as in the table: the `edit` of its column. */}
                    <DetailColumnField row={user} columns={USERS.columns} id="keywords" />
                    {/* Markdown: drawn, typed with its preview. */}
                    <DetailField
                      label="Bio"
                      icon={<NotebookTextIcon />}
                      stacked
                      edit={{ kind: "markdown", ...fromRule(USER_RULES.bio), value: user.bio, placeholder: "**Gras**, *italique*, listes, [liens](https://…)", onSave: (bio) => save({ bio }) }}
                    />
                  </DetailFields>
                </DetailSection>
                <DetailSection title="Accès">
                  <DetailFields>
                    {/* One line per value, its buttons on the right. */}
                    <DetailField label="Connexions" icon={<LinkIcon />}>
                      {connections.length > 0 && (
                        <DetailItems>
                          {connections.map((key) => (
                            <DetailItem
                              key={key}
                              icon={CONNECTIONS[key].icon}
                              actions={
                                key === "password" ? (
                                  <DetailItemButton label="Envoyer un lien de réinitialisation" onClick={would("la réinitialisation du mot de passe")}>
                                    <KeyRoundIcon />
                                  </DetailItemButton>
                                ) : (
                                  <DetailItemButton label={`Délier ${CONNECTIONS[key].label}`} onClick={would(`la déliaison de ${CONNECTIONS[key].label}`)}>
                                    <UnlinkIcon />
                                  </DetailItemButton>
                                )
                              }
                            >
                              {CONNECTIONS[key].label}
                            </DetailItem>
                          ))}
                        </DetailItems>
                      )}
                    </DetailField>
                    {/* The lines under the label, across the whole width. */}
                    <DetailField label="Tags" icon={USERS.columns.find((column) => column.id === "userTags")?.icon} stacked>
                      {user.userTags.length > 0 && (
                        <DetailItems>
                          {tagItems(user).map((tag) => (
                            <DetailItem
                              key={tag.key}
                              icon={tag.icon}
                              actions={
                                <DetailItemButton label={`Retirer ${tag.label}`} onClick={would(`le retrait du tag ${tag.label}`)}>
                                  <XIcon />
                                </DetailItemButton>
                              }
                            >
                              {tag.label}
                            </DetailItem>
                          ))}
                        </DetailItems>
                      )}
                    </DetailField>
                  </DetailFields>
                </DetailSection>
              </>
            ),
          },
          {
            id: "activity",
            label: "Activité",
            icon: <ActivityIcon />,
            content: (
              <>
                <DetailSection title="Activité">
                  {/* Drawn by its column, several picked in a list, saved as the list closes. */}
                  <DetailColumnFields row={user} columns={USERS.columns} ids={["activities", "storage", "categories"]} />
                </DetailSection>
                <DetailSection title="Technique">
                  <DetailColumnFields row={user} columns={USERS.columns} ids={["id", "avatarKey"]} />
                  <DetailFields>
                    {/* A long text under its label, across the whole width, edited in place on several lines. */}
                    <DetailField
                      label="Note"
                      icon={<StickyNoteIcon />}
                      copy={user.note}
                      stacked
                      edit={{ ...fromRule(USER_RULES.note), value: user.note, multiline: true, placeholder: "Une note pour l'équipe", onSave: (note) => save({ note }) }}
                    />
                  </DetailFields>
                </DetailSection>
              </>
            ),
          },
          {
            id: "history",
            label: "Historique",
            icon: <HistoryIcon />,
            content: (
              <DetailSection title="Historique">
                {/* Five at a time, « Voir plus » beyond; every save of this detail adds one. */}
                <DetailHistory
                  load={(cursor) =>
                    loadPocUserHistory(user.id, cursor).then(({ events, next }) => ({
                      next,
                      events: events.map((event) => ({ ...EVENT_LOOKS[event.kind], ...event, tone: event.failed ? "red" : EVENT_LOOKS[event.kind].tone })),
                    }))
                  }
                  refreshKey={version}
                />
              </DetailSection>
            ),
          },
        ]}
      />
    </>
  );
}
