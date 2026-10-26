"use client";

import { type ComponentProps, useSyncExternalStore } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

/** Cookie written by the shadcn sidebar to remember its collapsed state. */
export const SIDEBAR_STATE_COOKIE = "sidebar_state";

/** As in the shadcn sidebar: a week. */
const SIDEBAR_STATE_MAX_AGE = 60 * 60 * 24 * 7;

/** Open state saved in the cookie, or null when there is none to read (server, first visit). */
function readSidebarOpen(): boolean | null {
  if (typeof document === "undefined") {
    return null;
  }
  const value = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_STATE_COOKIE}=([^;]*)`))?.[1];
  return value === undefined ? null : value !== "false";
}

/*
 * The site and the back office each have a shell of their own, and the router
 * keeps the one left behind mounted but hidden, with its state. The open state
 * is therefore not held by either: both follow the cookie, and every change
 * is told to the shells mounted.
 */
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Saves the state, then tells the mounted shells. The sidebar writes the same cookie, but only after this call. */
function saveSidebarOpen(open: boolean) {
  document.cookie = `${SIDEBAR_STATE_COOKIE}=${open}; path=/; max-age=${SIDEBAR_STATE_MAX_AGE}`;
  for (const listener of listeners) {
    listener();
  }
}

/** Saved open state: `fallback` on the server and before any toggle, then the cookie. */
function useSavedSidebarOpenOr(fallback: boolean): boolean {
  return useSyncExternalStore(
    subscribe,
    () => readSidebarOpen() ?? fallback,
    () => fallback,
  );
}

/** Sidebar provider whose open state is shared by every shell through the cookie. */
export function PersistedSidebarProvider({
  defaultOpen = true,
  ...props
}: Omit<ComponentProps<typeof SidebarProvider>, "open" | "onOpenChange">) {
  const open = useSavedSidebarOpenOr(defaultOpen);
  return <SidebarProvider open={open} onOpenChange={saveSidebarOpen} {...props} />;
}

/** Saved open state for a static fallback: open on the server, read from the cookie in the browser. */
export function useSavedSidebarOpen(): boolean {
  return useSavedSidebarOpenOr(true);
}
