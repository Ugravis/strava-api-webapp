"use client";

import { useSearchParams } from "next/navigation";
import { useSyncExternalStore } from "react";

type Changes = Record<string, string | string[] | null>;

/**
 * The choices of the user, in the URL under the id of the table, so that
 * several tables share a page: `?users.sort=-createdAt&users.f.status=active`.
 * Written through the history, which Next follows without a server round trip.
 */
export function useTableParams(id: string) {
  const params = useSearchParams();
  const get = (key: string) => params.get(`${id}.${key}`);
  const list = (key: string) => {
    const raw = get(key);
    return raw === null ? null : raw.split(",").filter(Boolean);
  };
  return { get, list, set: (changes: Changes) => writeTableParams(id, changes) };
}

/** Null removes the key, back to the system. */
export function writeTableParams(id: string, changes: Changes) {
  const next = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) next.delete(`${id}.${key}`);
    else next.set(`${id}.${key}`, Array.isArray(value) ? value.join(",") : value);
  }
  const search = next.toString();
  window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}

/** The width under `sm`, where the header folds onto two lines and nothing is pinned. */
export const PHONE = "(max-width: 639px)";

export function usePhone() {
  return useSyncExternalStore(
    (onChange) => {
      const query = window.matchMedia(PHONE);
      query.addEventListener("change", onChange);
      return () => query.removeEventListener("change", onChange);
    },
    () => window.matchMedia(PHONE).matches,
    () => false,
  );
}
