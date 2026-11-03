import { useEffect, useRef } from "react";

/**
 * The header of a table follows the scroll of the page down to its last row:
 * an animation driven by the scroll, in `globals.css` (`.table-follow`). Only
 * its travel is measured here, on a change of size, never on a scroll. Off
 * when the box has a height of its own, its sticky header then does the job.
 * The ref goes on the header of the table; the class names on the box and the
 * header.
 */
export function useStickyHead(on: boolean) {
  const head = useRef<HTMLTableSectionElement>(null);
  useEffect(() => {
    const node = head.current;
    const box = node?.closest<HTMLElement>(".table-follow");
    if (!on || !node || !box) return;
    const measure = () => box.style.setProperty("--head-travel", `${Math.max(box.clientHeight - node.offsetHeight, 0)}px`);
    const observer = new ResizeObserver(measure);
    observer.observe(box);
    observer.observe(node);
    return () => {
      observer.disconnect();
      box.style.removeProperty("--head-travel");
    };
  }, [on]);
  return head;
}
