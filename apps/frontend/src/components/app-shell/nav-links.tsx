"use client";

import { Collapsible } from "@base-ui/react/collapsible";
import { ChevronDownIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type ReactNode, useState } from "react";
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

export interface NavLink {
  href: string;
  label: string;
  icon: ReactNode;
  /** Active on its own path only, not on the pages below it. */
  exact?: boolean;
  /** Figure shown in a pill at the end of the entry. */
  badge?: number;
}

/**
 * Plain sidebar entries, labelled by the caller (a server component, for
 * sections kept off the client messages). With a title, the group folds
 * under it and its entries hang from a vertical line; in the icon-only
 * sidebar it stays unfolded, set apart by a separator instead.
 */
export function NavLinks({ title, items, separated }: { title?: string; items: readonly NavLink[]; separated?: boolean }) {
  const pathname = usePathname();
  const { setOpenMobile, state, isMobile } = useSidebar();
  const [open, setOpen] = useState(true);
  const iconOnly = state === "collapsed" && !isMobile;

  const menu = (
    <SidebarMenu
      className={cn(
        "gap-1",
        title && "ml-2 w-auto border-l border-sidebar-border pl-2 group-data-[collapsible=icon]:ml-0 group-data-[collapsible=icon]:border-none group-data-[collapsible=icon]:pl-0",
      )}
    >
      {items.map((item) => {
        const active = item.exact ? pathname === item.href : pathname === item.href || pathname.startsWith(`${item.href}/`);
        return (
          <SidebarMenuItem key={item.href}>
            <SidebarMenuButton
              isActive={active}
              tooltip={item.label}
              render={<Link href={item.href} aria-current={active ? "page" : undefined} onClick={() => setOpenMobile(false)} />}
            >
              {item.icon}
              <span>{item.label}</span>
            </SidebarMenuButton>
            {item.badge === undefined ? null : (
              <SidebarMenuBadge className="rounded-full bg-sidebar-accent px-1.5">{item.badge.toLocaleString("fr-FR")}</SidebarMenuBadge>
            )}
          </SidebarMenuItem>
        );
      })}
    </SidebarMenu>
  );

  if (!title) {
    return (
      <SidebarGroup>
        <SidebarGroupContent>{menu}</SidebarGroupContent>
      </SidebarGroup>
    );
  }

  return (
    <>
      {separated ? <SidebarSeparator className="hidden group-data-[collapsible=icon]:block" /> : null}
      <Collapsible.Root open={open || iconOnly} onOpenChange={setOpen} render={<SidebarGroup />}>
        <SidebarGroupLabel
          render={<Collapsible.Trigger />}
          className="group/label h-7 cursor-pointer text-[0.65rem] tracking-wider text-sidebar-foreground/50 uppercase hover:text-sidebar-foreground/80 group-data-[collapsible=icon]:pointer-events-none"
        >
          {title}
          <ChevronDownIcon className="ml-auto size-3 -rotate-90 transition-transform group-data-panel-open/label:rotate-0" aria-hidden />
        </SidebarGroupLabel>
        <Collapsible.Panel className="h-(--collapsible-panel-height) overflow-hidden transition-[height] duration-200 ease-out data-ending-style:h-0 data-starting-style:h-0">
          <SidebarGroupContent>{menu}</SidebarGroupContent>
        </Collapsible.Panel>
      </Collapsible.Root>
    </>
  );
}
