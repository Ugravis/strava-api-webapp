"use client";

import type { ReactNode } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface ShowcaseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Medal or emblem, shown large. */
  media: ReactNode;
  title: string;
  /** Short line under the title: level, date… */
  subtitle?: ReactNode;
  description: string;
  footer?: ReactNode;
}

/** Details of a badge or a distinction shown on a profile. */
export function ShowcaseDialog({ open, onOpenChange, media, title, subtitle, description, footer }: ShowcaseDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader className="items-center gap-3 text-center sm:text-center">
          {media}
          <DialogTitle className="text-lg">{title}</DialogTitle>
          {subtitle && <p className="-mt-2 text-sm text-muted-foreground">{subtitle}</p>}
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {footer}
      </DialogContent>
    </Dialog>
  );
}
