"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

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
  close: () => void;
  isOpen: boolean;
  /** The `?row=` of the URL: the detail shown, or the one a shared link asks for. */
  activeId: string | null;
}

interface Entry extends SplitPanelOptions {
  content: ReactNode;
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

/** A choice kept in `localStorage`, read again by every panel when it changes. */
const listeners = new Set<() => void>();
function subscribe(onChange: () => void) {
  listeners.add(onChange);
  return () => listeners.delete(onChange);
}
function store(key: string, value: string | null) {
  if (value === null) localStorage.removeItem(key);
  else localStorage.setItem(key, value);
  listeners.forEach((listener) => listener());
}
/** The server knows neither: the defaults until the browser reads them. */
function useStored(key: string) {
  return useSyncExternalStore(subscribe, () => localStorage.getItem(key), () => null);
}

/** Written through the history, which Next follows without a server round trip. Null removes the key. */
function writeParams(changes: Record<string, string | null>) {
  const next = new URLSearchParams(window.location.search);
  for (const [key, value] of Object.entries(changes)) {
    if (value === null) next.delete(key);
    else next.set(key, value);
  }
  const search = next.toString();
  window.history.replaceState(null, "", search ? `?${search}` : window.location.pathname);
}

/**
 * The side panel of a section: a detail on the right of its pages, floating
 * over them (overlay) or beside them (split), over their whole width on a
 * phone. Owns the mode (`?panel=`, else `localStorage`), the width, the
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
  const mode: SplitPanelMode = (params.get(MODE_PARAM) ?? storedMode) === "split" ? "split" : "overlay";
  const storedWidth = Number(useStored(WIDTH_KEY));
  // Followed at once by the page while the edge is dragged, then stored.
  const [dragged, setDragged] = useState<number | null>(null);
  const width = dragged ?? (storedWidth > 0 ? storedWidth : DEFAULT_WIDTH);

  // Read by `open`, which stays stable for the pages.
  const modeRef = useRef(mode);
  useEffect(() => {
    modeRef.current = mode;
  }, [mode]);

  const open = useCallback((content: ReactNode, options: SplitPanelOptions = {}) => {
    setHistory((last) => {
      const entries = [...(last ? last.entries.slice(0, last.at + 1) : []), { content, ...options }].slice(-MAX_HISTORY);
      return { entries, at: entries.length - 1 };
    });
    setFolded(false);
    writeParams({ [ROW_PARAM]: options.id ?? null, [MODE_PARAM]: modeRef.current });
  }, []);
  const close = useCallback(() => {
    setHistory(null);
    setFolded(false);
    writeParams({ [ROW_PARAM]: null, [MODE_PARAM]: null });
  }, []);

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
    if (!isOpen) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && !event.defaultPrevented && close();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [isOpen, close]);

  const value = useMemo(() => ({ open, close, isOpen, activeId }), [open, close, isOpen, activeId]);

  const state: SplitPanelState = {
    entry: history ? history.entries[history.at] : null,
    canBack: !!history && history.at > 0,
    canForward: !!history && history.at < history.entries.length - 1,
    go: (step) => {
      const entry = history?.entries[history.at + step];
      if (!history || !entry) return;
      setHistory({ ...history, at: history.at + step });
      writeParams({ [ROW_PARAM]: entry.id ?? null });
    },
    close,
    mobile,
    mode,
    toggleMode: () => {
      const next = mode === "split" ? "overlay" : "split";
      store(MODE_KEY, next);
      writeParams({ [MODE_PARAM]: next });
    },
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
    </SplitPanelContext>
  );
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
