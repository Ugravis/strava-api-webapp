"use client";

import { type ReactNode, useState } from "react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { EmptyValue } from "./base";

/** An image of a row, e.g. a cover or a capture. */
export interface CellImage {
  src: string;
  /** Read by screen readers, and the title of the popup. */
  alt: string;
}

/** Opens its image in a popup; the popup is mounted at the first click only, as the bubbles of `Truncate`. */
function ImageButton({ image, className, children }: { image: CellImage; className?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const [armed, setArmed] = useState(false);
  return (
    <>
      <button
        type="button"
        aria-label={`Agrandir : ${image.alt}`}
        onClick={() => {
          setArmed(true);
          setOpen(true);
        }}
        className={cn("cursor-zoom-in overflow-hidden outline-none focus-visible:ring-3 focus-visible:ring-ring/50", className)}
      >
        {children}
      </button>
      {armed && (
        <Dialog open={open} onOpenChange={setOpen}>
          {/* The popup is a portal, yet its clicks bubble to the row in React: they must not open it. */}
          <DialogContent className="gap-2 p-2 sm:max-w-3xl" onClick={(event) => event.stopPropagation()}>
            <DialogTitle className="truncate px-1 pr-9 leading-7">{image.alt}</DialogTitle>
            {/* Any outside URL: nothing for the image optimizer to know. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={image.src} alt={image.alt} className="max-h-[80vh] w-full rounded-lg object-contain" />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}

/** A small thumbnail, the same in a table and a list; a click opens it whole. */
export function ImageCell({ image }: { image: CellImage | null | undefined }) {
  if (!image) return <EmptyValue />;
  return (
    <ImageButton image={image} className="flex h-6 w-9 shrink-0 rounded-sm border bg-muted align-middle">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.alt} loading="lazy" className="size-full object-cover" />
    </ImageButton>
  );
}

/** The cover at the top of a card, as the card preview of Notion; a click opens it whole. Light grey without an image. */
export function ImageCover({ image }: { image: CellImage | null | undefined }) {
  if (!image) return <div aria-hidden className="h-32 w-full shrink-0 rounded-t-xl border-b bg-muted" />;
  return (
    <ImageButton image={image} className="block h-32 w-full shrink-0 rounded-t-xl border-b bg-muted">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={image.src} alt={image.alt} loading="lazy" className="size-full object-cover" />
    </ImageButton>
  );
}
