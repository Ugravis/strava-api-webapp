"use client";

import { useRouter } from "next/navigation";
import { type ReactNode, type RefObject, useCallback, useEffect, useRef, useState } from "react";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";

/**
 * The work not saved of the panel, while `isOpen`: `attempt` does an action
 * at once or once its loss is accepted in `dialog`; `guard` counts a content
 * holding some; `asking` while the dialog is up.
 */
export function useUnsavedGuard(isOpen: boolean): {
  attempt: (action: () => void) => void;
  guard: (dirty: boolean) => () => void;
  asking: RefObject<(() => void) | null>;
  dialog: ReactNode;
} {
  // Contents holding work not saved: leaving them asks first, in a dialog.
  // One token per content counting, so that a guard dropped by « Abandonner » and then let go counts nothing.
  const dirty = useRef(new Set<object>());
  const [pending, setPending] = useState<(() => void) | null>(null);
  const pendingRef = useRef(pending);
  const isOpenRef = useRef(false);
  useEffect(() => {
    pendingRef.current = pending;
  }, [pending]);
  /** Does `action` at once, or once the loss of the work not saved is accepted. */
  const attempt = useCallback((action: () => void) => {
    if (isOpenRef.current && dirty.current.size > 0) setPending(() => action);
    else action();
  }, []);
  const guard = useCallback((on: boolean) => {
    if (!on) return () => {};
    const token = {};
    dirty.current.add(token);
    return () => void dirty.current.delete(token);
  }, []);
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);

  // Work not saved: leaving the page by one of its links asks first, closing the tab or reloading it as the browser does.
  const router = useRouter();
  useEffect(() => {
    if (!isOpen) return;
    const onClick = (event: MouseEvent) => {
      if (dirty.current.size === 0 || event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const link = event.target instanceof Element ? event.target.closest("a[href]") : null;
      if (!(link instanceof HTMLAnchorElement) || (link.target && link.target !== "_self") || link.hasAttribute("download")) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || url.pathname === window.location.pathname) return;
      // Before the link of Next handles it.
      event.preventDefault();
      event.stopPropagation();
      setPending(() => () => router.push(url.pathname + url.search + url.hash));
    };
    const onUnload = (event: BeforeUnloadEvent) => {
      if (dirty.current.size > 0) event.preventDefault();
    };
    document.addEventListener("click", onClick, true);
    window.addEventListener("beforeunload", onUnload);
    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("beforeunload", onUnload);
    };
  }, [isOpen, router]);

  const dialog = (
    <AlertDialog open={pending !== null} onOpenChange={(next) => !next && setPending(null)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Abandonner la saisie ?</AlertDialogTitle>
          <AlertDialogDescription>Les champs saisis et non enregistrés seront perdus.</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Continuer la saisie</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={() => {
              const action = pending;
              setPending(null);
              // Dropped by the dialog first: the guards of the content leaving no longer count.
              dirty.current.clear();
              action?.();
            }}
          >
            Abandonner
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );

  return { attempt, guard, asking: pendingRef, dialog };
}
