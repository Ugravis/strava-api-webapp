"use client";

import { type PointerEvent as ReactPointerEvent, type RefObject, useEffect, useState } from "react";

export interface PointedState<T> {
  /** Null when nothing is pointed at. */
  pointed: T | null;
  /** On entering, moving over or pressing a part of the chart, with what it shows (null for nothing). */
  point: (event: ReactPointerEvent, value: T | null) => void;
  /** On leaving the chart. */
  leave: (event: ReactPointerEvent) => void;
}

/**
 * The part of a chart pointed at, to show its details: hovered with a mouse;
 * tapped on a touch screen, where they stay until the same part or anything
 * outside `area` is tapped.
 */
export function usePointed<T>(area: RefObject<Element | null>, same: (a: T, b: T) => boolean = Object.is): PointedState<T> {
  const [pointed, setPointed] = useState<T | null>(null);

  useEffect(() => {
    if (pointed === null) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!area.current?.contains(event.target as Node)) setPointed(null);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [pointed, area]);

  const point = (event: ReactPointerEvent, value: T | null) => {
    if (event.pointerType === "mouse") setPointed(value);
    // A finger enters and moves as it taps: only its press counts.
    else if (event.type === "pointerdown") {
      setPointed((current) => (current !== null && value !== null && same(current, value) ? null : value));
    }
  };
  // A finger lifted leaves the chart: the details stay.
  const leave = (event: ReactPointerEvent) => {
    if (event.pointerType === "mouse") setPointed(null);
  };

  return { pointed, point, leave };
}
