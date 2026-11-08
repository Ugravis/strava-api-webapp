"use client";

import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminPermission,
  type AdminUserSummary,
  MODERATABLE_FIELDS,
  type ModeratableField,
} from "@kilotrace/shared/admin";
import { BanIcon, GavelIcon, LogOutIcon, ShieldCheckIcon, Trash2Icon, UnlinkIcon } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { ActionDialog, type ActionDialogProps } from "@/components/admin/action-dialog";
import { DetailFieldButton } from "@kilotrace/ui/components/admin/detail";
import type { ActRefusal } from "@/lib/admin/permissions";
import { deleteUser, liftSuspension, moderateUser, revokeSessions, suspendUser, unlinkStrava } from "./actions";
import { bumpUsers } from "./users-store";

export type UserActionKey = "moderate" | "lift" | "suspend" | "sessions" | "strava" | "delete";

/** An action on an account, as a button of the detail or an item of the menu of its row. */
export interface UserAction {
  key: UserActionKey;
  label: string;
  icon: ReactNode;
  destructive?: boolean;
  /** Not for this member, and why: greyed in the detail, left out of the menu. */
  locked: string | null;
}

/** Why a member may not act on an account at all. */
export const REFUSALS: Record<ActRefusal, string> = {
  self: "C'est votre compte : les actions sont désactivées.",
  protected: "Membre de l'équipe de rang égal ou supérieur : les actions sont désactivées.",
  readOnly: "Lecture seule : votre rôle n'a la permission d'aucune action sur les comptes.",
};

export const NOT_GRANTED = "Votre rôle n'a pas cette permission.";

/** The actions on an account, in the order of the buttons (the red ones last), each locked when the member may not run it. */
export function userActionsOf(user: AdminUserSummary, permissions: readonly AdminPermission[], refusal: ActRefusal | null): UserAction[] {
  const lock = (permission: AdminPermission) => (refusal ? REFUSALS[refusal] : permissions.includes(permission) ? null : NOT_GRANTED);
  const actions: (UserAction | false)[] = [
    { key: "moderate", label: "Modérer", icon: <GavelIcon />, locked: lock("users.moderate") },
    { key: "sessions", label: "Déconnecter", icon: <LogOutIcon />, locked: lock("users.sessions") },
    user.suspension
      ? { key: "lift", label: "Lever la suspension", icon: <ShieldCheckIcon />, locked: lock("users.suspend") }
      : { key: "suspend", label: "Suspendre", icon: <BanIcon />, destructive: true, locked: lock("users.suspend") },
    user.stravaConnected && { key: "strava", label: "Délier Strava", icon: <UnlinkIcon />, destructive: true, locked: lock("users.strava") },
    { key: "delete", label: "Supprimer", icon: <Trash2Icon />, destructive: true, locked: lock("users.delete") },
  ];
  return actions.filter((action) => action !== false);
}

/** The fields a moderation resets, by their name in the dialog. */
export const MODERATED_FIELDS: Record<ModeratableField, string> = {
  username: "Pseudo",
  displayName: "Nom affiché",
  bio: "Bio",
  city: "Ville et pays",
  avatar: "Photo",
};

/**
 * The gavel floating on a moderable field, in the table as in the detail:
 * opens the moderation with `field` checked. None when the member may not
 * moderate `user`.
 */
export function moderateTool(
  user: AdminUserSummary,
  field: ModeratableField,
  permissions: readonly AdminPermission[],
  refusal: ActRefusal | null,
  openAction: (user: AdminUserSummary, action: UserActionKey, fields?: ModeratableField[]) => void,
) {
  if (refusal || !permissions.includes("users.moderate")) return null;
  return (
    <DetailFieldButton label={`Modérer : ${MODERATED_FIELDS[field]}`} onClick={() => openAction(user, "moderate", [field])}>
      <GavelIcon aria-hidden />
    </DetailFieldButton>
  );
}

const DURATIONS = [
  { value: "7", label: "7 jours" },
  { value: "1", label: "24 heures" },
  { value: "30", label: "30 jours" },
  { value: "indefinite", label: "Indéterminée" },
  { value: "custom", label: "Jusqu'à une date" },
];

const reason = (presets: string[], required = true): ActionDialogProps["reason"] => ({
  label: "Raison",
  placeholder: "Expliquez la décision, elle est consignée dans le journal.",
  hint: `Entre ${ADMIN_REASON_MIN_LENGTH} et ${ADMIN_REASON_MAX_LENGTH} caractères.`,
  presetsLabel: "Raisons fréquentes",
  presets,
  required,
  min: ADMIN_REASON_MIN_LENGTH,
  max: ADMIN_REASON_MAX_LENGTH,
});

type DialogTexts = Omit<ActionDialogProps, "action" | "open" | "onOpenChange" | "onSuccess" | "cancelLabel">;

/** The dialog of `key`; `fields` checked on opening a moderation. */
export function dialogOf(key: UserActionKey, user: AdminUserSummary, fields?: ModeratableField[]): DialogTexts & { action: ActionDialogProps["action"] } {
  switch (key) {
    case "moderate":
      return {
        action: moderateUser.bind(null, user.id),
        title: "Réinitialiser des champs du profil",
        description: "Les champs choisis sont effacés ; le pseudo est remplacé par un pseudo généré. L'utilisateur est notifié avec la raison.",
        submitLabel: "Réinitialiser",
        choices: {
          name: "fields",
          legend: "Champs à réinitialiser",
          options: MODERATABLE_FIELDS.map((field) => ({ value: field, label: MODERATED_FIELDS[field] })),
          checked: fields,
        },
        reason: reason(["Contenu offensant ou haineux", "Usurpation d'identité", "Publicité ou spam", "Informations personnelles d'un tiers"]),
      };
    case "lift":
      return {
        action: liftSuspension.bind(null, user.id),
        title: "Lever la suspension",
        description: "Le compte peut de nouveau se connecter et son profil redevient visible.",
        submitLabel: "Lever",
        reason: reason([], false),
      };
    case "suspend":
      return {
        action: suspendUser.bind(null, user.id),
        title: "Suspendre le compte",
        description: "Les sessions sont fermées, la connexion est refusée avec la raison et le profil est masqué. Les données et la synchro Strava sont conservées.",
        submitLabel: "Suspendre",
        destructive: true,
        duration: { label: "Durée", options: DURATIONS, untilLabel: "Fin de la suspension" },
        reason: reason(["Comportement abusif envers la communauté", "Spam ou activité automatisée", "Usurpation d'identité", "Non-respect des conditions d'utilisation"]),
      };
    case "sessions":
      return {
        action: revokeSessions.bind(null, user.id),
        title: "Fermer toutes les sessions",
        description: "L'utilisateur est déconnecté de tous ses appareils et peut se reconnecter aussitôt.",
        submitLabel: "Déconnecter",
        reason: reason(["Session compromise ou appareil perdu", "Demande de l'utilisateur", "Activité suspecte sur le compte"], false),
      };
    case "strava":
      return {
        action: unlinkStrava.bind(null, user.id),
        title: "Délier le compte Strava",
        description: "L'accès est révoqué chez Strava et les activités synchronisées sont supprimées. L'utilisateur est notifié avec la raison et pourra relier son compte.",
        submitLabel: "Délier",
        destructive: true,
        reason: reason(["Compte Strava d'un tiers", "Données incohérentes à resynchroniser", "Demande de l'utilisateur"]),
      };
    case "delete":
      return {
        action: deleteUser.bind(null, user.id),
        title: "Supprimer définitivement le compte",
        description: "Le compte et toutes ses données sont supprimés, l'accès Strava est révoqué. Irréversible ; seul le journal garde la trace de l'action.",
        submitLabel: "Supprimer",
        destructive: true,
        reason: reason(["Demande d'effacement (RGPD)", "Compte frauduleux", "Compte en double"]),
        confirmation: { label: `Tapez ${user.username} pour confirmer`, expected: user.username },
      };
  }
}

/**
 * The confirmation of an action on an account, opened by a button or a menu
 * item; `fields` checked in a moderation opened from a field. `onDone` once
 * it went through, the account deleted or not.
 */
export function UserActionDialog({
  user,
  action,
  fields,
  open,
  onOpenChange,
  onDone,
}: {
  user: AdminUserSummary;
  action: UserActionKey;
  fields?: ModeratableField[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (action: UserActionKey) => void;
}) {
  return <ActionDialog {...dialogOf(action, user, fields)} cancelLabel="Annuler" open={open} onOpenChange={onOpenChange} onSuccess={() => onDone(action)} />;
}

/**
 * Opens the confirmation of an action on an account; `dialog` goes anywhere
 * in the page. Once done, the list and the detail fetch again; `onDeleted`
 * once an account is deleted, e.g. to close its panel.
 */
export function useUserActionDialog(onDeleted: (id: string) => void) {
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [state, setState] = useState<{ user: AdminUserSummary; action: UserActionKey; fields?: ModeratableField[]; open: boolean } | null>(null);
  const dialog = state && (
    <UserActionDialog
      user={state.user}
      action={state.action}
      fields={state.fields}
      open={state.open}
      onOpenChange={(open) => setState({ ...state, open })}
      onDone={(action) => {
        bumpUsers();
        if (action === "delete") onDeleted(state.user.id);
      }}
    />
  );
  // Stable: the config of a table depends on it, and a new one would fetch the page again.
  const openAction = useCallback((user: AdminUserSummary, action: UserActionKey, fields?: ModeratableField[]) => setState({ user, action, fields, open: true }), []);
  return { openAction, dialog };
}
