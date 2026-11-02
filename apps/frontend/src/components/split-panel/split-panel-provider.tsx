"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { store, useStored, writeParams } from "./storage";

export type SplitPanelMode = "overlay" | "split";

export interface SplitPanelOptions {
  /** Kept in `?row=`, so that the link opens the same detail. */
  id?: string;
  /** Above the content, in the header of the panel. */
  title?: string;
}

interface SplitPanelContextValue {
  /** Shows `content` in the panel, after what it showed: back and forward go through them. */
  open: (content: ReactNode, options?: SplitPanelOptions) => void;
  /** Shows `content` in place of what the panel shows, without a new step of back and forward, nor asking first: e.g. a row once created. */
  replace: (content: ReactNode, options?: SplitPanelOptions) => void;
  close: () => void;
  /** Counts a content holding work not saved yet, while `dirty`: leaving it asks first. */
  guard: (dirty: boolean) => () => void;
  isOpen: boolean;
  /** The `?row=` of the URL: the detail shown, or the one a shared link asks for. */
  activeId: string | null;
}

interface Entry extends SplitPanelOptions {
  content: ReactNode;
  /** Its own: a content opened again starts afresh, even of the same component. */
  key: number;
}

/** What the panel itself needs, apart from the pages. */
export interface SplitPanelState {
  entry: Entry | null;
  canBack: boolean;
  canForward: boolean;
  go: (step: -1 | 1) => void;
  close: () => void;
  mobile: boolean;
  mode: SplitPanelMode;
  toggleMode: () => void;
  /** Over the whole page, as a page of its own; the mode comes back on leaving. */
  expanded: boolean;
  setExpanded: (expanded: boolean) => void;
  folded: boolean;
  setFolded: (folded: boolean) => void;
  width: number;
  /** While its edge is dragged, then once more with `done` on release; null back to the default. */
  resize: (width: number | null, done: boolean) => void;
  dragging: boolean;
}

const SplitPanelContext = createContext<SplitPanelContextValue | null>(null);
const SplitPanelStateContext = createContext<SplitPanelState | null>(null);

const MODE_KEY = "split-panel.mode";
const WIDTH_KEY = "split-panel.width";
const ROW_PARAM = "row";
const MODE_PARAM = "panel";
const DEFAULT_WIDTH = 400;
/** Entries kept for back and forward. */
const MAX_HISTORY = 50;
let shown = 0;

/**
 * The side panel of a section: a detail on the right of its pages, floating
 * over them (overlay) or beside them (split), over their whole width on a
 * phone, or over the whole page (`?panel=full`). Owns the mode (`?panel=`,
 * else `localStorage`), the width, the
 * entries shown, `Esc`, and closes on a change of page. Pages only hand it
 * their content through `useSplitPanel()`; `SplitPanelArea` draws it.
 */
export function SplitPanelProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const params = useSearchParams();
  const activeId = params.get(ROW_PARAM);
  const mobile = useIsMobile();
  const [history, setHistory] = useState<{ entries: Entry[]; at: number } | null>(null);
  const [folded, setFolded] = useState(false);
  const storedMode = useStored(MODE_KEY);
  const asked = params.get(MODE_PARAM);
  const expanded = asked === "full" && !mobile;
  const mode: SplitPanelMode = ((asked === "full" ? null : asked) ?? storedMode) === "split" ? "split" : "overlay";
  const storedWidth = Number(useStored(WIDTH_KEY));
  // Followed at once by the page while the edge is dragged, then stored.
  const [dragged, setDragged] = useState<number | null>(null);
  const width = dragged ?? (storedWidth > 0 ? storedWidth : DEFAULT_WIDTH);

  // Read by `open`, which stays stable for the pages.
  const modeRef = useRef<string>(mode);
  useEffect(() => {
    modeRef.current = expanded ? "full" : mode;
  }, [mode, expanded]);

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

  const show = useCallback((content: ReactNode, options: SplitPanelOptions, replacing: boolean) => {
    setHistory((last) => {
      const kept = last ? last.entries.slice(0, last.at + (replacing ? 0 : 1)) : [];
      const entries = [...kept, { content, ...options, key: ++shown }].slice(-MAX_HISTORY);
      return { entries, at: entries.length - 1 };
    });
    setFolded(false);
    writeParams({ [ROW_PARAM]: options.id ?? null, [MODE_PARAM]: modeRef.current });
  }, []);
  const open = useCallback((content: ReactNode, options: SplitPanelOptions = {}) => attempt(() => show(content, options, false)), [attempt, show]);
  const replace = useCallback((content: ReactNode, options: SplitPanelOptions = {}) => show(content, options, true), [show]);
  const close = useCallback(
    () =>
      attempt(() => {
        setHistory(null);
        setFolded(false);
        writeParams({ [ROW_PARAM]: null, [MODE_PARAM]: null });
      }),
    [attempt],
  );

  // Another page: its rows are not those of the detail.
  const shownOn = useRef(pathname);
  useEffect(() => {
    if (shownOn.current === pathname) return;
    shownOn.current = pathname;
    setHistory(null);
  }, [pathname]);

  // Left to a menu or a dialog that handled it first.
  const isOpen = history !== null;
  useEffect(() => {
    isOpenRef.current = isOpen;
  }, [isOpen]);
  useEffect(() => {
    if (!isOpen) return;
    // Out of the whole page first, then closed.
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== "Escape" || event.defaultPrevented || pendingRef.current) return;
      if (new URLSearchParams(window.location.search).get(MODE_PARAM) === "full") writeParams({ [MODE_PARAM]: localStorage.getItem(MODE_KEY) ?? "overlay" });
      else close();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

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

  const value = useMemo(() => ({ open, replace, close, guard, isOpen, activeId }), [open, replace, close, guard, isOpen, activeId]);

  const state: SplitPanelState = {
    entry: history ? history.entries[history.at] : null,
    canBack: !!history && history.at > 0,
    canForward: !!history && history.at < history.entries.length - 1,
    go: (step) => {
      const entry = history?.entries[history.at + step];
      if (!history || !entry) return;
      attempt(() => {
        setHistory({ ...history, at: history.at + step });
        writeParams({ [ROW_PARAM]: entry.id ?? null });
      });
    },
    close,
    mobile,
    mode,
    toggleMode: () => {
      const next = mode === "split" ? "overlay" : "split";
      store(MODE_KEY, next);
      writeParams({ [MODE_PARAM]: next });
    },
    expanded,
    setExpanded: (next) => writeParams({ [MODE_PARAM]: next ? "full" : mode }),
    folded,
    setFolded,
    width,
    resize: (next, done) => {
      if (done) store(WIDTH_KEY, next === null ? null : String(next));
      setDragged(done ? null : next);
    },
    dragging: dragged !== null,
  };

  return (
    <SplitPanelContext value={value}>
      <SplitPanelStateContext value={state}>{children}</SplitPanelStateContext>
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
    </SplitPanelContext>
  );
}

/**
 * Asks before the panel leaves its content while `dirty` (work typed, not
 * saved): closed, another row opened, back or forward, a link of the page
 * followed; the browser asks too on closing or reloading the tab. Outside a
 * panel (a dialog, a page), only the browser asks.
 */
export function useSplitPanelGuard(dirty: boolean) {
  const guard = useContext(SplitPanelContext)?.guard;
  useEffect(() => guard?.(dirty), [guard, dirty]);
  useEffect(() => {
    if (guard || !dirty) return;
    const onUnload = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", onUnload);
    return () => window.removeEventListener("beforeunload", onUnload);
  }, [guard, dirty]);
}

/** `open(content, { id, title })` and `close()`, from any page under a `SplitPanelProvider`. */
export function useSplitPanel() {
  const value = useContext(SplitPanelContext);
  if (!value) throw new Error("useSplitPanel must be used under a SplitPanelProvider");
  return value;
}

/** For `SplitPanelArea` only. */
export function useSplitPanelState() {
  const value = useContext(SplitPanelStateContext);
  if (!value) throw new Error("SplitPanelArea must be used under a SplitPanelProvider");
  return value;
}
