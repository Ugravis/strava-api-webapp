"use client";

import NextLink from "next/link";
import { usePathname as useNextPathname, useRouter as useNextRouter } from "next/navigation";
import { type ComponentProps, type ComponentType, createContext, type ReactNode, useContext } from "react";

type LinkProps = Omit<ComponentProps<typeof NextLink>, "href" | "locale"> & { href: string };

interface AppRouter {
  push(href: string, options?: { scroll?: boolean }): void;
  replace(href: string, options?: { scroll?: boolean }): void;
  back(): void;
}

/**
 * How the shared components move through the app that renders them. The
 * public site gives its localized navigation, which adds the language prefix
 * to the paths and removes it from the current one; the back office, which
 * has a single language, keeps the default one of Next.js.
 */
export interface AppNavigation {
  Link: ComponentType<LinkProps>;
  usePathname: () => string;
  useRouter: () => AppRouter;
}

const NavigationContext = createContext<AppNavigation>({
  Link: NextLink,
  usePathname: useNextPathname,
  useRouter: useNextRouter,
});

export function NavigationProvider({ value, children }: { value: AppNavigation; children: ReactNode }) {
  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}

/** A link to a path of the app, without its language prefix. */
export function AppLink(props: LinkProps) {
  const { Link } = useContext(NavigationContext);
  return <Link {...props} />;
}

/** The current path, without its language prefix. */
export function useAppPathname(): string {
  return useContext(NavigationContext).usePathname();
}

/** A router taking paths without their language prefix. */
export function useAppRouter(): AppRouter {
  return useContext(NavigationContext).useRouter();
}
