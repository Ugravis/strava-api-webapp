"use client";

import { defaultDisplayOf, RELEASE_NOTE_DISPLAYS, type ReleaseNoteDisplay } from "@kilotrace/shared";
import { ADMIN_REASON_MAX_LENGTH, ADMIN_REASON_MIN_LENGTH, type AdminReleaseNote, RELEASE_NOTE_RULES, type ReleaseNoteState, type UpdateReleaseNoteRequest } from "@kilotrace/shared/admin";
import {
  CalendarClockIcon,
  CalendarPlusIcon,
  CircleDotIcon,
  EyeIcon,
  HistoryIcon,
  MegaphoneIcon,
  PercentIcon,
  RadioTowerIcon,
  ReceiptTextIcon,
  TextIcon,
  TypeIcon,
  UserPenIcon,
  UsersIcon,
} from "lucide-react";
import {
  type ConfirmOptions,
  type DataTableColumn,
  dateColumn,
  lookColumn,
  Mark,
  numberColumn,
  pillsColumn,
  statusColumn,
  textColumn,
  type Tone,
  userColumn,
} from "@/components/admin/data-table";
import { fromRule } from "@/components/admin/detail";
import { createVersion } from "@/lib/admin/version";
import { deleteReleaseNote, saveReleaseNote, setReleaseNoteStatus } from "./actions";

/*
 * How a release and its note are drawn and changed, shared by the table and the detail.
 */

/** The version of the releases: the `refreshKey` of their table and of their detail. */
export const { useVersion: useReleaseNotesVersion, bump: bumpReleaseNotes } = createVersion();

/** What the permissions of the current member allow on the notes. */
export interface ReleaseNoteRights {
  create: boolean;
  edit: boolean;
  publish: boolean;
  delete: boolean;
}

export const LOCKS = {
  create: "Réservé aux membres qui écrivent les notes à l'avance",
  edit: "Réservé aux membres qui modifient les notes",
  publish: "Réservé aux membres qui publient les notes",
  delete: "Réservé aux membres qui suppriment les notes",
  released: "Version sortie : sa ligne reste, videz la note pour la retirer",
};

export const STATES: Record<ReleaseNoteState, { label: string; tone: Tone }> = {
  empty: { label: "Sans note", tone: "gray" },
  draft: { label: "Brouillon", tone: "amber" },
  scheduled: { label: "Programmée", tone: "blue" },
  published: { label: "Publiée", tone: "green" },
  silent: { label: "Historique seul", tone: "violet" },
};

/** What each state means, under the status of the detail. */
export const STATE_HINTS: Record<ReleaseNoteState, string> = {
  empty: "Rien à montrer : écrivez au moins un titre, un résumé ou une section.",
  draft: "Jamais montrée aux utilisateurs tant qu'elle n'est pas prête.",
  scheduled: "Prête : montrée d'elle-même dès que le site démarrera sur cette version.",
  published: "Montrée aux utilisateurs inscrits avant la sortie, selon son affichage.",
  silent: "Prête, mais seulement dans l'historique « Nouveautés » : ni popup, ni bandeau, ni notification.",
};

export const DISPLAYS: Record<ReleaseNoteDisplay, { label: string; tone: Tone; description: string }> = {
  popup: { label: "Popup + notification", tone: "violet", description: "Fenêtre à l'ouverture du site" },
  banner: { label: "Bandeau + notification", tone: "sky", description: "Bandeau au-dessus des pages" },
  notification: { label: "Notification seule", tone: "amber", description: "Dans la cloche uniquement" },
  none: { label: "Aucun", tone: "gray", description: "Historique « Nouveautés » seulement" },
};

export const IMPACTS = { popup: "majeure", banner: "mineure", notification: "corrective", none: "" } as const;

export const RELEASES = {
  released: { label: "Sorties", tone: "green" },
  upcoming: { label: "À venir", tone: "blue" },
} as const;

export const displayOptions = (version: string | null) =>
  RELEASE_NOTE_DISPLAYS.map((display) => ({
    value: display,
    label: DISPLAYS[display].label,
    tone: DISPLAYS[display].tone,
    description: version && defaultDisplayOf(version) === display ? `${DISPLAYS[display].description} · par défaut (version ${IMPACTS[display]})` : DISPLAYS[display].description,
  }));

/** Saves fields of a note; the table and the detail fetch again. */
export async function saveNote(note: AdminReleaseNote, patch: UpdateReleaseNoteRequest) {
  const result = await saveReleaseNote(note.version, patch);
  if (result.ok) bumpReleaseNotes();
  return result;
}

const people = (count: number) => `${count.toLocaleString("fr-FR")} ${count > 1 ? "utilisateurs concernés" : "utilisateur concerné"}`;

/** Making a note ready, or back to a draft, asked first: what it changes for the users. */
export function publishOf(note: AdminReleaseNote): { label: string; lock: string | null; confirm: ConfirmOptions; run: () => Promise<unknown> } {
  const ready = note.status === "ready";
  const shown = note.display !== "none";
  const how = DISPLAYS[note.display].label.toLowerCase();
  const run = async () => {
    const result = await setReleaseNoteStatus(note.version, ready ? "draft" : "ready");
    if (result.ok) bumpReleaseNotes();
    return result;
  };
  if (ready) {
    return {
      label: "Repasser en brouillon",
      lock: null,
      confirm: {
        title: `Repasser la v${note.version} en brouillon ?`,
        description: note.notifiedAt
          ? "La note quitte l'historique et ses notifications sont retirées, lues ou non. Une nouvelle publication notifiera à nouveau."
          : "La note ne sera plus montrée, ni à la sortie de la version, ni dans l'historique.",
        confirmLabel: "Repasser en brouillon",
        destructive: false,
      },
      run,
    };
  }
  return {
    label: note.releasedAt ? "Publier" : "Programmer",
    lock: note.hasContent ? null : "Note vide : écrivez au moins un titre, un résumé ou une section",
    confirm: {
      title: `${note.releasedAt ? "Publier" : "Programmer"} la note de la v${note.version} ?`,
      description: !note.releasedAt
        ? `Elle partira d'elle-même au premier démarrage du site sur la v${note.version}${shown ? `, en ${how}` : ", dans l'historique seulement"}.`
        : shown
          ? `Elle est montrée dès maintenant aux ${people(note.concernedCount ?? 0)} (inscrits avant la sortie), en ${how}.`
          : "Elle rejoint l'historique « Nouveautés », sans popup, bandeau ni notification.",
      confirmLabel: note.releasedAt ? "Publier" : "Programmer",
      destructive: false,
    },
    run,
  };
}

/** The deletion of a note written ahead, asked first with a reason and its version typed. `done` once deleted. */
export function deleteOf(note: AdminReleaseNote, done: () => void): { confirm: ConfirmOptions; run: (reason: string | undefined) => Promise<unknown> } {
  return {
    confirm: {
      title: `Supprimer la note de la v${note.version} ?`,
      description: "Définitif : la note écrite à l'avance disparaît. La ligne reviendra vide si cette version sort.",
      confirmLabel: "Supprimer",
      destructive: true,
      reason: {
        label: "Raison",
        placeholder: "Expliquez la décision, elle est consignée dans le journal.",
        required: true,
        minLength: ADMIN_REASON_MIN_LENGTH,
        maxLength: ADMIN_REASON_MAX_LENGTH,
        presets: ["Version abandonnée", "Mauvais numéro de version", "Doublon"],
      },
      typed: { label: `Tapez ${note.version} pour confirmer`, expected: note.version },
    },
    run: async (reason) => {
      const result = await deleteReleaseNote(note.version, reason);
      if (result.ok) {
        bumpReleaseNotes();
        done();
      }
      return result;
    },
  };
}

export const CurrentMark = () => <Mark label="Version en ligne" tone="green" icon={<RadioTowerIcon />} />;

/** Seen among those concerned, in percent; none before the release. */
export const rateOf = (note: AdminReleaseNote) => (note.concernedCount ? Math.round((note.seenCount / note.concernedCount) * 100) : null);

/** The columns; `edit` edits the title, the summary and the display in place. */
export const releaseNoteColumns = (edit: boolean): DataTableColumn<AdminReleaseNote>[] => {
  const locked = edit ? null : LOCKS.edit;
  return [
    lookColumn({
      id: "version",
      header: "Version",
      icon: <ReceiptTextIcon />,
      sortable: true,
      value: (note) => ({ icon: <ReceiptTextIcon />, name: `v${note.version}`, color: note.releasedAt ? null : "#3b82f6" }),
      marks: (note) => note.current && <CurrentMark />,
    }),
    textColumn({
      id: "title",
      header: "Titre",
      icon: <TypeIcon />,
      value: (note) => note.title,
      width: "max-w-72",
      edit: (note) => ({
        kind: "text",
        ...fromRule(RELEASE_NOTE_RULES.title),
        value: note.title,
        placeholder: "Une carte plus rapide",
        locked,
        onSave: (title) => saveNote(note, { title: title?.trim() || null }),
      }),
    }),
    statusColumn({ id: "state", header: "Statut", icon: <CircleDotIcon />, value: (note) => note.state, statuses: STATES }),
    pillsColumn({
      id: "display",
      header: "Affichage",
      icon: <MegaphoneIcon />,
      value: (note) => [{ label: DISPLAYS[note.display].label, tone: DISPLAYS[note.display].tone }],
      edit: (note) => ({
        kind: "select",
        value: note.display,
        options: displayOptions(note.version),
        required: true,
        locked,
        onSave: (display) => saveNote(note, { display: (display ?? defaultDisplayOf(note.version)) as ReleaseNoteDisplay }),
      }),
    }),
    dateColumn({ id: "releasedAt", header: "Sortie", icon: <CalendarClockIcon />, sortable: true, value: (note) => note.releasedAt }),
    numberColumn({ id: "concerned", header: "Concernés", icon: <UsersIcon />, sortable: true, value: (note) => note.concernedCount }),
    numberColumn({ id: "seen", header: "Vue par", icon: <EyeIcon />, sortable: true, value: (note) => (note.releasedAt ? note.seenCount : null), zero: true }),
    numberColumn({ id: "rate", header: "Lecture", icon: <PercentIcon />, sortable: true, value: rateOf, unit: "%", zero: true }),
    textColumn({
      id: "summary",
      header: "Résumé",
      icon: <TextIcon />,
      value: (note) => note.summary,
      muted: true,
      width: "max-w-80",
      edit: (note) => ({
        kind: "text",
        ...fromRule(RELEASE_NOTE_RULES.summary),
        value: note.summary,
        multiline: true,
        placeholder: "Une ou deux phrases : le bandeau, la notification et le haut de la popup",
        locked,
        onSave: (summary) => saveNote(note, { summary: summary?.trim() || null }),
      }),
    }),
    dateColumn({ id: "updatedAt", header: "Modifiée", icon: <HistoryIcon />, sortable: true, value: (note) => note.updatedAt, relative: true }),
    userColumn({ id: "updatedBy", header: "Par", icon: <UserPenIcon />, locked: false, value: (note) => note.updatedBy, empty: "Système" }),
    dateColumn({ id: "createdAt", header: "Ligne créée", icon: <CalendarPlusIcon />, value: (note) => note.createdAt, time: true }),
  ];
};
