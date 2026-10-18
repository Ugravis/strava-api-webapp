"use client";

import { useEffect, useState } from "react";

/**
 * False on the first paint, true right after: a progress drawn from this
 * value fills up from zero when it appears.
 */
export function useRevealed(): boolean {
  const [revealed, setRevealed] = useState(false);

  useEffect(() => {
    // Two frames: the empty state is painted before the transition starts.
    let frame = requestAnimationFrame(() => {
      frame = requestAnimationFrame(() => setRevealed(true));
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  return revealed;
}
