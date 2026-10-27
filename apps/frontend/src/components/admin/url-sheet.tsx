"use client";

import { useRouter } from "next/navigation";
import { useState, type ReactNode } from "react";
import { Sheet, SheetContent } from "@/components/ui/sheet";

/**
 * Side panel opened by a query parameter, rendered on the server: closing it
 * goes to `closeHref`, so that the panel can be linked and the back button
 * closes it. Generic: its texts come from the caller.
 */
export function UrlSheet({ closeHref, children }: { closeHref: string; children: ReactNode }) {
  const router = useRouter();
  const [open, setOpen] = useState(true);

  return (
    <Sheet
      open={open}
      onOpenChange={(next) => {
        if (!next) {
          setOpen(false);
          router.push(closeHref, { scroll: false });
        }
      }}
    >
      <SheetContent className="w-full gap-0 overflow-y-auto data-[side=right]:sm:max-w-lg">{children}</SheetContent>
    </Sheet>
  );
}
