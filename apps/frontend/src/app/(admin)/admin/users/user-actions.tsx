"use client";

import {
  ADMIN_REASON_MAX_LENGTH,
  ADMIN_REASON_MIN_LENGTH,
  type AdminPermission,
  type AdminUserSummary,
  MODERATABLE_FIELDS,
  type ModeratableField,
} from "@kilotrace/shared/admin";
import { BanIcon, EraserIcon, LogOutIcon, ShieldCheckIcon, Trash2Icon, UnlinkIcon } from "lucide-react";
import { type ReactNode, useCallback, useState } from "react";
import { ActionDialog, type ActionDialogProps } from "@/components/admin/action-dialog";
import { useSplitPanel } from "@/components/split-panel";
import { deleteUser, liftSuspension, moderateUser, revokeSessions, suspendUser, unlinkStrava } from "./actions";
import { bumpUsers } from "./users-store";

export type UserActionKey = "moderate" | "lift" | "suspend" | "sessions" | "strava" | "delete";

/** An action on an account, as a button of the detail or an item of the menu of its row. */
export interface UserAction {
  key: UserActionKey;
  label: string;
  icon: ReactNode;
  destructive?: boolean;
}

/** The actions on an account the permissions grant, in the order of the buttons: the red ones last. */
export function userActionsOf(user: AdminUserSummary, permissions: readonly AdminPermission[]): UserAction[] {
  const can = (permission: AdminPermission) => permissions.includes(permission);
  return [
    can("users.moderate") && { key: "moderate" as const, label: "Modérer", icon: <EraserIcon /> },
    can("users.sessions") && { key: "sessions" as const, label: "Déconnecter", icon: <LogOutIcon /> },
    can("users.suspend") &&
      (user.suspension
        ? { key: "lift" as const, label: "Lever la suspension", icon: <ShieldCheckIcon /> }
        : { key: "suspend" as const, label: "Suspendre", icon: <BanIcon />, destructive: true }),
    can("users.strava") && user.stravaConnected && { key: "strava" as const, label: "Délier Strava", icon: <UnlinkIcon />, destructive: true },
    can("users.delete") && { key: "delete" as const, label: "Supprimer", icon: <Trash2Icon />, destructive: true },
  ].filter((action) => action !== false);
}

const FIELDS: Record<ModeratableField, string> = {
  username: "Pseudo",
  displayName: "Nom affiché",
  bio: "Bio",
  city: "Ville et pays",
  avatar: "Photo",
};

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

function dialogOf(key: UserActionKey, user: AdminUserSummary): DialogTexts & { action: ActionDialogProps["action"] } {
  switch (key) {
    case "moderate":
      return {
        action: moderateUser.bind(null, user.id),
        title: "Réinitialiser des champs du profil",
        description: "Les champs choisis sont effacés ; le pseudo est remplacé par un pseudo généré. L'utilisateur est notifié avec la raison.",
        submitLabel: "Réinitialiser",
        choices: { name: "fields", legend: "Champs à réinitialiser", options: MODERATABLE_FIELDS.map((field) => ({ value: field, label: FIELDS[field] })) },
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
 * item. `onDone` once it went through, the account deleted or not.
 */
export function UserActionDialog({
  user,
  action,
  open,
  onOpenChange,
  onDone,
}: {
  user: AdminUserSummary;
  action: UserActionKey;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onDone: (action: UserActionKey) => void;
}) {
  return <ActionDialog {...dialogOf(action, user)} cancelLabel="Annuler" open={open} onOpenChange={onOpenChange} onSuccess={() => onDone(action)} />;
}

/**
 * Opens the confirmation of an action on an account; `dialog` goes anywhere
 * in the page. Once done, the list and the detail fetch again; a deleted
 * account open in the panel closes it.
 */
export function useUserActionDialog() {
  const { close, activeId } = useSplitPanel();
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [state, setState] = useState<{ user: AdminUserSummary; action: UserActionKey; open: boolean } | null>(null);
  const dialog = state && (
    <UserActionDialog
      user={state.user}
      action={state.action}
      open={state.open}
      onOpenChange={(open) => setState({ ...state, open })}
      onDone={(action) => {
        if (action === "delete" && activeId === state.user.id) close();
        bumpUsers();
      }}
    />
  );
  // Stable: the config of a table depends on it, and a new one would fetch the page again.
  const openAction = useCallback((user: AdminUserSummary, action: UserActionKey) => setState({ user, action, open: true }), []);
  return { openAction, dialog };
}
