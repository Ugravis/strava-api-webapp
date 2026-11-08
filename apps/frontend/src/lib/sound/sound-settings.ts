import { useSyncExternalStore } from "react";

/** Sound of the site: on or off, and its volume from 0 to 1. */
export interface SoundSettings {
  enabled: boolean;
  volume: number;
}

const STORAGE_KEY = "sound-settings";
export const DEFAULT_SOUND: SoundSettings = { enabled: true, volume: 0.5 };

let settings: SoundSettings | null = null;
const listeners = new Set<() => void>();

function clampVolume(volume: unknown): number {
  return typeof volume === "number" && Number.isFinite(volume) ? Math.min(1, Math.max(0, volume)) : DEFAULT_SOUND.volume;
}

/** The settings kept by the browser, the defaults without any or when storage is blocked. */
function load(): SoundSettings {
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as Partial<SoundSettings> | null;
    if (!stored) return DEFAULT_SOUND;
    return { enabled: stored.enabled !== false, volume: clampVolume(stored.volume) };
  } catch {
    return DEFAULT_SOUND;
  }
}

/** The current settings; the defaults on the server. */
export function soundSettings(): SoundSettings {
  if (typeof window === "undefined") return DEFAULT_SOUND;
  settings ??= load();
  return settings;
}

/** Changes the settings and keeps them in the browser. */
export function updateSoundSettings(change: Partial<SoundSettings>): void {
  const next = { ...soundSettings(), ...change };
  next.volume = clampVolume(next.volume);
  settings = next;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Not kept: the settings still apply until the page is closed.
  }
  for (const listener of listeners) listener();
}

/** Calls `listener` on each change of the settings; returns the unsubscribe. */
export function subscribeSoundSettings(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSoundSettings(): SoundSettings {
  return useSyncExternalStore(subscribeSoundSettings, soundSettings, () => DEFAULT_SOUND);
}
