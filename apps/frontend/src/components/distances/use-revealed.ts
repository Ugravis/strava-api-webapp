"use client";

import { type RefObject, useEffect, useRef, useState } from "react";

/** Wait once on screen, so that the page is painted before anything moves. */
const REVEAL_DELAY_MS = 200;

/**
 * False until the element of the ref is on screen in a visible tab, then
 * true: a progress drawn from this value fills up from zero under the eyes
 * of the user, not while the page loads or the tab is in the background.
 */
export function useRevealed<T extends Element>(): [RefObject<T | null>, boolean] {
  const ref = useRef<T>(null);
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || revealed) return;
    let inView = false;
    let timer: number | undefined;
    const reveal = () => {
      if (inView && document.visibilityState === "visible" && timer === undefined) {
        timer = window.setTimeout(() => setRevealed(true), REVEAL_DELAY_MS);
      }
    };
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      reveal();
    });
    observer.observe(element);
    document.addEventListener("visibilitychange", reveal);
    return () => {
      observer.disconnect();
      document.removeEventListener("visibilitychange", reveal);
      window.clearTimeout(timer);
    };
  }, [revealed]);

  return [ref, revealed];
}
