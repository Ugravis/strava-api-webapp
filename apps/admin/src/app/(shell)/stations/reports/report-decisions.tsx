"use client";

import { STATION_REPORT_CUSTOM_DISMISSAL, STATION_REPORT_DISMISSALS, STATION_REPORT_NOTE_MAX_LENGTH, type StationReportDismissal } from "@kilotrace/shared";
import type { AdminStationReport } from "@kilotrace/shared/admin";
import type { ConfirmOptions } from "@kilotrace/ui/components/admin/data-table";
import { acceptStationReport, completeStationReport, dismissStationReport } from "./actions";
import { bumpStationReports, STATION_REPORT_DISMISSAL_LABELS } from "./report-bits";

/*
 * Decisions on a report of the railway data, shared by the menu of its row
 * and its detail. Each is told to the author, the note with it.
 */

export const STATION_REPORTS_NOT_GRANTED = "Votre rôle n'a pas la permission de traiter les signalements de gares.";

type Decision = { confirm: ConfirmOptions; run: (note: string | undefined, choice?: string) => Promise<unknown> };

const note = (placeholder: string) => ({
  label: "Note pour l'auteur",
  placeholder,
  maxLength: STATION_REPORT_NOTE_MAX_LENGTH,
});

/** Runs a decision, then the reports fetch again. */
const deciding =
  (decide: (note: string | undefined, choice?: string) => Promise<{ ok: boolean }>) =>
  async (text: string | undefined, choice?: string) => {
    const result = await decide(text, choice);
    if (result.ok) bumpStationReports();
    return result;
  };

/** Accepted: relevant, to be done with the next updates; the author can be told later once it is live. */
export function acceptanceOf(report: AdminStationReport): Decision {
  return {
    confirm: {
      title: "Accepter ce signalement ?",
      description: "Il est pertinent et sera pris en compte lors des prochaines mises à jour. Son auteur en est prévenu ; il pourra l'être à nouveau quand la modification sera effective.",
      confirmLabel: "Accepter",
      destructive: false,
      reason: note("Facultatif : ce qui sera fait, quand…"),
    },
    run: deciding((text) => acceptStationReport(report.id, text)),
  };
}

/** Dismissed with a reason of the list, told to the author with the note. */
export function dismissalOf(report: AdminStationReport): Decision {
  return {
    confirm: {
      title: "Classer sans suite ?",
      description: "Le signalement est clos. Son auteur est prévenu, avec le motif et la note.",
      confirmLabel: "Classer sans suite",
      destructive: false,
      choice: {
        label: "Motif",
        options: STATION_REPORT_DISMISSALS.map((value) => ({ value, label: STATION_REPORT_DISMISSAL_LABELS[value] })),
        reasonRequiredFor: [STATION_REPORT_CUSTOM_DISMISSAL],
      },
      reason: note("Facultatif, sauf pour « Autre »."),
    },
    run: deciding((text, choice) => dismissStationReport(report.id, choice as StationReportDismissal, text)),
  };
}

/** The change asked by an accepted report is live: its author is told, and the report is closed. */
export function completionOf(report: AdminStationReport): Decision {
  return {
    confirm: {
      title: "Marquer comme fait et prévenir le membre ?",
      description: "La modification demandée est effective sur le site. Son auteur en est prévenu et le signalement est clos.",
      confirmLabel: "Fait · Prévenir le membre",
      destructive: false,
      reason: note("Facultatif : ce qui a changé."),
    },
    run: deciding((text) => completeStationReport(report.id, text)),
  };
}
