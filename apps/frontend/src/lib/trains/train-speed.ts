import { useSyncExternalStore } from "react";

/** Speeds of the trains offered on the slider, as a factor of the real one; the second is the real speed. */
export const TRAIN_SPEED_STEPS = [0.5, 1, 2, 5, 10] as const;
export const REAL_TRAIN_SPEED = 1;
/** Bounds of a speed entered manually. */
export const MIN_TRAIN_SPEED = 0.1;
export const MAX_TRAIN_SPEED = 20;

const STORAGE_KEY = "train-speed";

let speed: number | null = null;
const listeners = new Set<() => void>();

export function clampTrainSpeed(value: number): number {
  return Number.isFinite(value)
    ? Math.min(MAX_TRAIN_SPEED, Math.max(MIN_TRAIN_SPEED, value))
    : REAL_TRAIN_SPEED;
}

/** The speed kept by the browser, the real one without any or when storage is blocked. */
function load(): number {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    return stored === null ? REAL_TRAIN_SPEED : clampTrainSpeed(Number(stored));
  } catch {
    return REAL_TRAIN_SPEED;
  }
}

/** How fast the trains run, as a factor of their real speed; the real speed on the server. */
export function trainSpeed(): number {
  if (typeof window === "undefined") return REAL_TRAIN_SPEED;
  speed ??= load();
  return speed;
}

/** Changes the speed of the trains and keeps it in the browser. */
export function setTrainSpeed(value: number): void {
  speed = clampTrainSpeed(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, String(speed));
  } catch {
    // Not kept: the speed still applies until the page is closed.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useTrainSpeed(): number {
  return useSyncExternalStore(subscribe, trainSpeed, () => REAL_TRAIN_SPEED);
}
