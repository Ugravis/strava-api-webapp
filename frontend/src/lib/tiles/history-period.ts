import type { HistoryMode } from "@/lib/api/types";

/** A step of the history slider, counting back from today. */
export interface HistoryStep {
  unit: "week" | "month" | "year";
  count: number;
}

/** Steps of the slider, finer for the recent past. */
export const HISTORY_STEPS: readonly HistoryStep[] = [
  { unit: "week", count: 1 },
  { unit: "week", count: 2 },
  { unit: "month", count: 1 },
  { unit: "month", count: 3 },
  { unit: "month", count: 6 },
  { unit: "year", count: 1 },
  { unit: "year", count: 2 },
  { unit: "year", count: 3 },
  { unit: "year", count: 5 },
  { unit: "year", count: 10 },
];

/** Step selected when the tool opens: one month. */
export const DEFAULT_STEP_INDEX = 2;

/**
 * Day of the history: picked on the slider (`step`, an index of
 * `HISTORY_STEPS`) or entered manually (`step` null).
 */
export interface HistoryDay {
  step: number | null;
  /** Local day, `yyyy-mm-dd`. */
  day: string;
}

/** What the history tool shows. */
export interface HistorySettings {
  mode: HistoryMode;
  date: HistoryDay;
}

const pad = (value: number) => String(value).padStart(2, "0");

/** Local day of `date`, `yyyy-mm-dd`. */
export function dayOf(date: Date): string {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

/** Local midnight starting `day`. */
function startOf(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  return new Date(year, month - 1, date);
}

/** Day `step` before `today`; a month or a year back from the 31st ends on the last day of the shorter month. */
export function stepDay(step: HistoryStep, today: string): string {
  const date = startOf(today);
  if (step.unit === "week") {
    date.setDate(date.getDate() - 7 * step.count);
    return dayOf(date);
  }
  const months = step.unit === "month" ? step.count : 12 * step.count;
  const target = new Date(date.getFullYear(), date.getMonth() - months, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(date.getDate(), lastDay));
  return dayOf(target);
}

/**
 * Steps worth offering: up to the first one reaching back to the first
 * visit, further steps showing the same map. All of them without a first visit.
 */
export function availableSteps(firstVisitAt: string | null, today: string): number {
  if (!firstVisitAt) return HISTORY_STEPS.length;
  const first = dayOf(new Date(firstVisitAt));
  const index = HISTORY_STEPS.findIndex((step) => stepDay(step, today) <= first);
  return index === -1 ? HISTORY_STEPS.length : index + 1;
}

/** The day of a step, its index clamped to the steps offered. */
export function dayAtStep(step: number, count: number, today: string): HistoryDay {
  const index = Math.max(0, Math.min(step, count - 1));
  return { step: index, day: stepDay(HISTORY_STEPS[index], today) };
}

/**
 * Instant the backend compares the first visits with: the tiles gained
 * since the start of the day, or visited until its end, the map as it was
 * that evening.
 */
export function historyInstant({ mode, date }: HistorySettings): string {
  const instant = startOf(date.day);
  if (mode === "state") instant.setDate(instant.getDate() + 1);
  return instant.toISOString();
}

/** `settings` with its step brought back within the steps offered. */
export function withinSteps(settings: HistorySettings, count: number, today: string): HistorySettings {
  const { step } = settings.date;
  return step !== null && step >= count ? { ...settings, date: dayAtStep(step, count, today) } : settings;
}
