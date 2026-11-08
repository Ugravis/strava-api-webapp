"use client";

import { ADMIN_REASON_MAX_LENGTH, ADMIN_REASON_MIN_LENGTH, type AdminUserReport, type AdminUserSummary, type ModeratableField, type UserReportSanction } from "@kilotrace/shared/admin";
import { useCallback, useState } from "react";
import { ActionDialog } from "@/components/admin/action-dialog";
import type { ConfirmOptions } from "@kilotrace/ui/components/admin/data-table";
import { dialogOf, type UserActionKey } from "../user-actions";
import { bumpUsers } from "../users-store";
import { closeReportAsSanctioned, dismissReport, sanctionReport } from "./actions";
import { bumpReports } from "./report-bits";

/*
 * Decisions on a report, shared by the menu of its row and its detail.
 */

/** The actions on the account taken as a sanction, by the sanction they record. */
export const SANCTIONS: Partial<Record<UserActionKey, UserReportSanction>> = { moderate: "moderation", suspend: "suspension", delete: "deletion" };

export const REPORTS_NOT_GRANTED = "Votre rôle n'a pas la permission de traiter les signalements.";

/** Once decided: the reports and the accounts fetch again. */
export function decided() {
  bumpReports();
  bumpUsers();
}

const reasonOptions = (presets: string[]) => ({
  label: "Raison",
  placeholder: "Expliquez la décision, elle est consignée dans le journal.",
  required: true,
  minLength: ADMIN_REASON_MIN_LENGTH,
  maxLength: ADMIN_REASON_MAX_LENGTH,
  presets,
});

/** Closing a report without acting on the account, asked first: as sanctioned (`mark`) or dismissed. */
export function closingOf(report: AdminUserReport, kind: "mark" | "dismiss"): { confirm: ConfirmOptions; run: (reason: string | undefined) => Promise<unknown> } {
  const run = async (reason: string | undefined) => {
    const result = await (kind === "mark" ? closeReportAsSanctioned : dismissReport)(report.id, reason ?? "");
    if (result.ok) decided();
    return result;
  };
  return kind === "mark"
    ? {
        confirm: {
          title: "Clore comme sanctionné ?",
          description:
            "Le compte reste tel quel : à utiliser pour une sanction déjà prise (sinon, utilisez le bouton « Modérer »). Tous les signalements ouverts sur ce compte sont clos et leurs auteurs prévenus.",
          confirmLabel: "Clore",
          destructive: false,
          reason: reasonOptions(["Déjà suspendu", "Avertissement envoyé", "Déjà modéré"]),
        },
        run,
      }
    : {
        confirm: {
          title: "Rejeter ce signalement ?",
          description: "Aucune sanction n'est prise. Seul ce signalement est clos, son auteur en est prévenu et pourra en envoyer un autre.",
          confirmLabel: "Rejeter",
          destructive: false,
          reason: reasonOptions(["Aucune infraction constatée", "Signalement abusif", "Doublon"]),
        },
        run,
      };
}

/** The dialog of a sanction taken from a report: the one of the action on the account, sent with the report. */
export function useSanctionDialog() {
  // Kept once closed, so that the texts stay while the dialog fades out.
  const [state, setState] = useState<{ reportId: string; user: AdminUserSummary; key: UserActionKey; fields?: ModeratableField[]; open: boolean } | null>(null);
  const sanction = state && SANCTIONS[state.key];
  const dialog = state && sanction && (
    <ActionDialog
      {...dialogOf(state.key, state.user, state.fields)}
      action={sanctionReport.bind(null, state.reportId, sanction)}
      cancelLabel="Annuler"
      open={state.open}
      onOpenChange={(open) => setState({ ...state, open })}
      onSuccess={decided}
    />
  );
  // Stable: the config of the table depends on it.
  const openSanction = useCallback(
    (reportId: string, user: AdminUserSummary, key: UserActionKey, fields?: ModeratableField[]) => setState({ reportId, user, key, fields, open: true }),
    [],
  );
  return { openSanction, dialog };
}
