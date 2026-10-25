"use client";

import { DownloadIcon, Share2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { type RefObject, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { cardImage } from "./card-image";

interface CardImageDialogProps {
  card: RefObject<HTMLElement | null>;
  /** Hue of the background behind the card. */
  color: string | null;
  username: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Picture = { state: "loading" } | { state: "failed" } | { state: "ready"; file: File; url: string };

/** Preview of the picture of a profile card, to download or share; drawn once mounted, so mounted when opened. */
export function CardImageDialog({ card, color, username, open, onOpenChange }: CardImageDialogProps) {
  const t = useTranslations("profile.image");
  const [picture, setPicture] = useState<Picture>({ state: "loading" });

  useEffect(() => {
    if (!card.current) return;
    let cancelled = false;
    let url: string | null = null;
    cardImage(card.current, color).then(
      (blob) => {
        if (cancelled) return;
        url = URL.createObjectURL(blob);
        setPicture({ state: "ready", url, file: new File([blob], `${username}.png`, { type: "image/png" }) });
      },
      () => !cancelled && setPicture({ state: "failed" }),
    );
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [card, color, username]);

  const ready = picture.state === "ready" ? picture : null;
  const canShare =
    ready !== null && typeof navigator !== "undefined" && navigator.canShare?.({ files: [ready.file] }) === true;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description")}</DialogDescription>
        </DialogHeader>
        {picture.state === "failed" ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t("failed")}</p>
        ) : ready ? (
          // A local blob: nothing for the image optimizer to do.
          // eslint-disable-next-line @next/next/no-img-element
          <img src={ready.url} alt={t("alt", { username })} className="mx-auto max-h-[60svh] w-auto max-w-full rounded-2xl" />
        ) : (
          <Skeleton className="aspect-[4/5] w-full rounded-2xl" />
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          {canShare && (
            <Button
              variant="outline"
              onClick={() => void navigator.share({ files: [ready.file] }).catch(() => {})}
            >
              <Share2Icon aria-hidden />
              {t("share")}
            </Button>
          )}
          <Button
            disabled={!ready}
            nativeButton={false}
            render={<a href={ready?.url} download={ready?.file.name} />}
          >
            <DownloadIcon aria-hidden />
            {t("download")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
