"use client";

import { useEffect, useState } from "react";

/** Whole seconds left before an ISO instant, ticking every second; 0 once passed. */
export function useSecondsUntil(instant: string): number {
  const target = Date.parse(instant);
  const [now, setNow] = useState(() => Date.now());
  const done = now >= target;

  useEffect(() => {
    if (done) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [done, target]);

  return Math.max(0, Math.ceil((target - now) / 1000));
}
