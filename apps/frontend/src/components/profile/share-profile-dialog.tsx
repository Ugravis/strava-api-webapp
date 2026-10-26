"use client";

import { CheckIcon, CopyIcon, Share2Icon } from "lucide-react";
import { useTranslations } from "next-intl";
import { QRCodeSVG } from "qrcode.react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@kilotrace/ui/components/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "@/components/ui/input-group";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { userProfileHref } from "@/config/routes";

interface ShareProfileDialogProps {
  username: string;
  name: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Link to a profile, to copy or share, or its QR code to scan. */
export function ShareProfileDialog({ username, name, open, onOpenChange }: ShareProfileDialogProps) {
  const t = useTranslations("profile.share");
  const [copied, setCopied] = useState(false);
  const url = typeof window === "undefined" ? "" : new URL(userProfileHref(username), window.location.origin).href;
  const canShare = typeof navigator !== "undefined" && "share" in navigator;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t("copyFailed"));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("description", { name })}</DialogDescription>
        </DialogHeader>
        <Tabs defaultValue="link" className="gap-4">
          <TabsList className="w-full">
            <TabsTrigger value="link">{t("link")}</TabsTrigger>
            <TabsTrigger value="qr">{t("qr")}</TabsTrigger>
          </TabsList>
          <TabsContent value="link" className="flex flex-col gap-3">
            <InputGroup>
              <InputGroupInput value={url} readOnly aria-label={t("link")} onFocus={(event) => event.target.select()} />
              <InputGroupAddon align="inline-end">
                <InputGroupButton size="icon-xs" onClick={() => void copy()} aria-label={t("copy")} title={t("copy")}>
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </InputGroupButton>
              </InputGroupAddon>
            </InputGroup>
            {canShare && (
              <Button variant="outline" onClick={() => void navigator.share({ title: name, url }).catch(() => {})}>
                <Share2Icon aria-hidden />
                {t("native")}
              </Button>
            )}
          </TabsContent>
          <TabsContent value="qr" className="flex flex-col items-center gap-2">
            {/* White whatever the theme: scanners read dark on light. */}
            <div className="rounded-xl bg-white p-4 ring-1 ring-border">
              <QRCodeSVG value={url} size={192} marginSize={0} title={t("qrLabel", { name })} />
            </div>
            <p className="text-xs text-muted-foreground">{t("qrHint")}</p>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
