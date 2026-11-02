"use client";

import { useCallback, useEffect } from "react";
import { useSplitPanel } from "@/components/split-panel";
import { loadUserDetail } from "./actions";
import { UserRowPanel } from "./user-detail";

export type OpenUser = (user: { id: string; username: string }) => void;

/**
 * An account opened in the side panel from another page (an entry of the
 * logs, the owner of a file), and the account of `?row=` once on arrival:
 * an id of another table loads nothing.
 */
export function useUserPanel(): OpenUser {
  const { open } = useSplitPanel();
  const openUser = useCallback((user: { id: string; username: string }) => open(<UserRowPanel id={user.id} />, { id: user.id, title: `@${user.username}` }), [open]);
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("row");
    if (id) loadUserDetail(id).then((data) => data && openUser(data.user), () => {});
  }, [openUser]);
  return openUser;
}
