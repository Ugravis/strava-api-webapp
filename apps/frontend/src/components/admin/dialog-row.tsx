"use client";

import { type ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

interface DialogRowProps {
  /** Opens the row, for the screen readers. */
  label: string;
  title: string;
  /** Everything about the row, beyond what its cells have room for. */
  details: ReactNode;
  className?: string;
  children: ReactNode;
}

/**
 * Table row opening its details in a dialog, except from the links and the
 * buttons it holds. Generic: its texts come from the caller.
 */
export function DialogRow({ label, title, details, className, children }: DialogRowProps) {
  const [open, setOpen] = useState(false);
  const fromControl = (target: EventTarget) => target instanceof Element && target.closest("a, button") !== null;

  return (
    <>
      <tr
        tabIndex={0}
        aria-label={label}
        aria-haspopup="dialog"
        onClick={(event) => !fromControl(event.target) && setOpen(true)}
        onKeyDown={(event) => event.key === "Enter" && event.target === event.currentTarget && setOpen(true)}
        className={cn("cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-ring/50 focus-visible:ring-inset", className)}
      >
        {children}
      </tr>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>
          {/* A link inside, e.g. to a user, closes the dialog on its way. */}
          <div onClick={(event) => event.target instanceof Element && event.target.closest("a") && setOpen(false)}>{details}</div>
        </DialogContent>
      </Dialog>
    </>
  );
}
