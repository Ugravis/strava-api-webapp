"use client";

import { type ComponentProps, useState, useSyncExternalStore } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";

/** Cookie written by the shadcn sidebar to remember its collapsed state. */
export const SIDEBAR_STATE_COOKIE = "sidebar_state";

/** Open state saved in the cookie, or null when there is none to read (server, first visit). */
function readSidebarOpen(): boolean | null {
  if (typeof document === "undefined") {
    return null;
  }
  const value = document.cookie.match(new RegExp(`(?:^|; )${SIDEBAR_STATE_COOKIE}=([^;]*)`))?.[1];
  return value === undefined ? null : value !== "false";
}

/**
 * Sidebar provider started from the cookie as it stands in the browser: when
 * the shell is mounted again, between the site and the back office, the
 * state rendered by the server may be older than the last toggle.
 */
export function PersistedSidebarProvider({ defaultOpen, ...props }: ComponentProps<typeof SidebarProvider>) {
  const [initialOpen] = useState(() => readSidebarOpen() ?? defaultOpen);
  return <SidebarProvider defaultOpen={initialOpen} {...props} />;
}

const noSubscription = () => () => {};

/** Saved open state for a static fallback: open on the server, read from the cookie in the browser. */
export function useSavedSidebarOpen(): boolean {
  return useSyncExternalStore(
    noSubscription,
    () => readSidebarOpen() ?? true,
    () => true,
  );
}
