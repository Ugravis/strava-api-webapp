"use client";

import { useLayoutEffect, useRef, useState } from "react";

/** Width of the box of a chart, measured before the first paint so that the chart never shows empty. */
export function useChartWidth() {
  const container = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  useLayoutEffect(() => {
    const element = container.current;
    if (!element) return;
    setWidth(element.getBoundingClientRect().width);
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return { container, width };
}
