"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { DetailEmpty, DetailSkeleton, type RowPanelControls } from "@/components/admin/detail";
import { useSplitPanel } from "@/components/split-panel";
import { loadUserTag, loadUserTagContext } from "../user-tags/actions";
import { UserTagRowPanel } from "../user-tags/user-tag-detail";
import { loadUserDetail } from "./actions";
import { UserRowPanel } from "./user-detail";

export type OpenUser = (user: { id: string; username: string }) => void;
export type OpenTag = (tag: { id: string; name: string }) => void;

/*
 * Accounts and tags opened in the side panel from another page or from each
 * other (an entry of the logs, the owner of a file, a tag of an account).
 * Their ids never meet: uuids and slugs.
 */

/** Opens an account in the side panel. */
export function useOpenUser(): OpenUser {
  const { open } = useSplitPanel();
  return useCallback((user) => open(<UserRowPanel id={user.id} />, { id: user.id, title: `@${user.username}` }), [open]);
}

/** Opens a tag in the side panel, its holders opened there too. */
export function useOpenTag(): OpenTag {
  const { open } = useSplitPanel();
  return useCallback((tag) => open(<TagPanel id={tag.id} />, { id: tag.id, title: tag.name }), [open]);
}

/** The tag of `?row=` once on arrival, on a page opening the accounts: an id of another table loads nothing. */
export function useTagArrival() {
  const openTag = useOpenTag();
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("row");
    if (id) loadUserTag(id).then((tag) => tag && openTag(tag), () => {});
  }, [openTag]);
}

/** Opens an account in the side panel; the account or the tag of `?row=` once on arrival. */
export function useUserPanel(): OpenUser {
  const openUser = useOpenUser();
  useTagArrival();
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("row");
    if (id) loadUserDetail(id).then((data) => data && openUser(data.user), () => {});
  }, [openUser]);
  return openUser;
}

/** A tag outside its page: the rights of the member loaded first; « Dupliquer » leads to the page of the tags. */
function TagPanel({ id }: { id: string }) {
  const router = useRouter();
  const { close } = useSplitPanel();
  const openUser = useOpenUser();
  const openTag = useOpenTag();
  const [context, setContext] = useState<Awaited<ReturnType<typeof loadUserTagContext>> | null | undefined>();
  useEffect(() => {
    loadUserTagContext().then(setContext, () => setContext(null));
  }, []);
  if (context === undefined) return <DetailSkeleton media actions={2} sections={[7, 2, 3]} />;
  if (context === null) return <DetailEmpty title="Chargement impossible" />;
  const controls: RowPanelControls = {
    open: (tag) => openTag({ id: tag, name: tag }),
    create: () => router.push(`${context.tagsPath}?row=new:tag`),
    created: () => {},
    removed: close,
    renamed: () => {},
    close,
  };
  return <UserTagRowPanel id={id} rights={context.rights} usersPath={context.usersPath} panel={controls} openUser={openUser} />;
}
