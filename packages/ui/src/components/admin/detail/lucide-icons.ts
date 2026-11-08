import { icons } from "lucide-react";

/*
 * Every icon of Lucide, in a chunk of its own, loaded by `icon-picker.tsx`
 * the first time an icon is drawn by its name.
 */

/** Without hyphens, lower case: `grid-3x3` and `Grid3x3` meet. */
export const iconKey = (name: string) => name.replace(/-/g, "").toLowerCase();

/** The components by `iconKey`, and the names in kebab case, e.g. `arrow-big-up`. */
export const LUCIDE = {
  byKey: new Map(Object.entries(icons).map(([pascal, icon]) => [iconKey(pascal), icon])),
  names: Object.keys(icons).map((pascal) => pascal.replace(/([a-z0-9])([A-Z])/g, "$1-$2").replace(/([a-z])(\d)/g, "$1-$2").toLowerCase()),
};
