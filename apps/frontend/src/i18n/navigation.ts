import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/** Navigation of the site: paths are written without their language prefix, which these add and remove. */
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
