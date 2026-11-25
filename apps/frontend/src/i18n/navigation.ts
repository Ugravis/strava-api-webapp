import { splitHref } from "@kilotrace/shared";
import { createNavigation } from "next-intl/navigation";
import { type ComponentProps, createElement } from "react";
import { routing } from "./routing";

const navigation = createNavigation(routing);

type Href = ComponentProps<typeof navigation.Link>["href"];

/**
 * A path of the code, `/profiles?user=x#top` alike, as next-intl takes it:
 * its pathname localized (`/fr/profils`), its query and anchor kept. Unknown
 * paths go through as they are.
 */
function hrefOf(href: string): Href {
  const { pathname, search, hash } = splitHref(href);
  if (!search && !hash) return href as Href;
  return {
    pathname,
    query: Object.fromEntries(new URLSearchParams(search)),
    ...(hash && { hash: hash.slice(1) }),
  } as unknown as Href;
}

type LinkProps = Omit<ComponentProps<typeof navigation.Link>, "href"> & { href: string };

/**
 * Navigation of the site: paths are written as in the code, without their
 * language prefix, which these add and remove, and localized
 * (`/settings` → `/fr/parametres`). `usePathname` answers the path of the
 * code.
 */
export function Link({ href, ...props }: LinkProps) {
  return createElement(navigation.Link, { ...props, href: hrefOf(href) });
}

export const usePathname = navigation.usePathname as () => string;

export function useRouter() {
  const router = navigation.useRouter();
  return {
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(hrefOf(href) as never, options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(hrefOf(href) as never, options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(hrefOf(href) as never, options),
  };
}

export function redirect({ href, locale }: { href: string; locale: Parameters<typeof navigation.redirect>[0]["locale"] }): never {
  return navigation.redirect({ href: hrefOf(href) as never, locale });
}

export function getPathname({ href, locale }: { href: string; locale: Parameters<typeof navigation.getPathname>[0]["locale"] }): string {
  return navigation.getPathname({ href: hrefOf(href) as never, locale });
}
