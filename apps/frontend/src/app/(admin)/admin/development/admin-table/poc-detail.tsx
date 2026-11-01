"use client";

import {
  BanIcon,
  CircleCheckIcon,
  KeyRoundIcon,
  LinkIcon,
  LogInIcon,
  MailIcon,
  PencilIcon,
  RotateCcwIcon,
  StickyNoteIcon,
  TagIcon,
  TypeIcon,
  UnlinkIcon,
  UserPlusIcon,
  XIcon,
} from "lucide-react";
import { toast } from "sonner";
import {
  DetailAction,
  DetailActions,
  DetailColumnFields,
  DetailCover,
  DetailFieldButton,
  DetailField,
  DetailFields,
  DetailHeader,
  DetailItem,
  DetailItemButton,
  DetailItems,
  DetailLoader,
  DetailSkeleton,
  DetailSection,
  DetailTimeline,
  DetailTimelineItem,
} from "@/components/admin/detail";
import { UserAvatar } from "@/components/user/user-avatar";
import { USERS } from "./poc-columns";
import { POC_NOW, type PocUser } from "./poc-data";
import { CONNECTIONS, connectionsOf, tagItems, UserMarks } from "./poc-marks";
import { loadPocUser, savePocUser, usePocVersion } from "./poc-store";

/** Every action of the demo only says what it would do. */
const would = (what: string) => () => toast(`Ouvrirait : ${what}`);

/** The account loaded by the panel, its skeleton meanwhile; loaded again once saved. */
export function PocUserPanel({ id }: { id: string }) {
  const version = usePocVersion();
  return (
    <DetailLoader id={id} load={loadPocUser} refreshKey={version} skeleton={<DetailSkeleton cover actions={3} sections={[6, 2, 3, 3]} />}>
      {(user) => <PocUserDetail user={user} />}
    </DetailLoader>
  );
}

const DAY = 86_400_000;
const before = (iso: string, days: number) => new Date(Date.parse(iso) - days * DAY).toISOString();

/** Made up from the account, the latest first, as the log of the team would serve it. */
function historyOf(user: PocUser) {
  const now = new Date(POC_NOW).toISOString();
  const events = [
    { key: "signup", date: user.createdAt, icon: <UserPlusIcon />, tone: "green" as const, title: "Inscription", details: `Par ${user.signInMethods.includes("google") ? "Google" : "e-mail"}` },
    ...(user.lastSeenAt ? [{ key: "seen", date: user.lastSeenAt, icon: <LogInIcon />, tone: "default" as const, title: "Dernière visite" }] : []),
    ...user.userTags.map((tag, at) => ({ key: `tag-${tag.id}`, date: before(user.lastSeenAt ?? now, 3 + at * 5), icon: <TagIcon />, tone: "blue" as const, title: `Tag « ${tag.name} » ajouté`, details: "Par @alice_martin" })),
    ...(user.lastAction
      ? [
          {
            key: "action",
            date: before(now, 2),
            icon: user.lastAction.kind === "suspend" ? <BanIcon /> : <CircleCheckIcon />,
            tone: user.lastAction.failedStatus ? ("red" as const) : user.lastAction.kind === "suspend" ? ("amber" as const) : ("default" as const),
            title: user.lastAction.label,
            details: user.lastAction.failedStatus ? `Échec : ${user.lastAction.failedStatus}` : "Par @alice_martin",
          },
        ]
      : []),
  ];
  return events.sort((a, b) => b.date.localeCompare(a.date));
}

/** What the detail panel shows of a fake account, with the cells of its table: the content only, the panel is the layout's. */
export function PocUserDetail({ user }: { user: PocUser }) {
  const connections = connectionsOf(user);
  return (
    <>
      <DetailCover image={user.cover} />
      <DetailHeader
        media={<UserAvatar user={user} className="size-12" />}
        title={user.displayName ?? `@${user.username}`}
        subtitle={`@${user.username}`}
        marks={<UserMarks user={user} />}
        actions={<DetailAction label="Modifier" icon={<PencilIcon aria-hidden />} onClick={would(`la modification de @${user.username}`)} />}
      />
      {/* A row of buttons right under the header. */}
      <DetailActions>
        <DetailAction label="Écrire" icon={<MailIcon aria-hidden />} onClick={would("un e-mail")} />
        <DetailAction label="Réinitialiser le nom" icon={<RotateCcwIcon aria-hidden />} onClick={would("la remise à zéro du nom")} />
        <DetailAction label="Suspendre" icon={<BanIcon aria-hidden />} variant="destructive" onClick={would("la suspension")} />
      </DetailActions>
      {user.status === "suspended" && (
        <DetailSection title="Suspension" tone="danger">
          <p className="text-sm">Compte suspendu : il ne peut plus se connecter et n&apos;apparaît plus sur le site.</p>
        </DetailSection>
      )}
      <DetailSection title="Compte">
        {/* « Couverture » small, as in the table, while the cover above shows it large. */}
        <DetailFields>
          {/* Edited in place: an e-mail without « @ » is refused, the field stays open. */}
          <DetailField
            label="Nom affiché"
            icon={<TypeIcon />}
            edit={{ value: user.displayName, placeholder: "Aucun", onSave: (displayName) => savePocUser(user.id, { displayName }) }}
          />
          {/* A button of its own floating before copy and edit. */}
          <DetailField
            label="E-mail"
            icon={<MailIcon />}
            copy={user.email}
            tools={
              <DetailFieldButton label="Écrire à cette adresse" onClick={would(`un e-mail à ${user.email}`)}>
                <MailIcon />
              </DetailFieldButton>
            }
            edit={{ value: user.email, onSave: (email) => savePocUser(user.id, { email: email ?? "" }) }}
          />
        </DetailFields>
        <DetailColumnFields row={user} columns={USERS.columns} ids={["status", "cover", "createdAt", "lastSeenAt"]} />
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
      <DetailSection title="Activité">
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
            edit={{ value: user.note, multiline: true, placeholder: "Une note pour l'équipe", onSave: (note) => savePocUser(user.id, { note }) }}
          />
        </DetailFields>
      </DetailSection>
      <DetailSection title="Historique">
        <DetailTimeline>
          {historyOf(user).map((event) => (
            <DetailTimelineItem key={event.key} icon={event.icon} tone={event.tone} title={event.title} date={event.date} now={POC_NOW}>
              {"details" in event ? event.details : null}
            </DetailTimelineItem>
          ))}
        </DetailTimeline>
      </DetailSection>
    </>
  );
}
