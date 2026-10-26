"use client";

import { LockIcon, LockOpenIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useId, useState } from "react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@kilotrace/ui/components/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { useCurrentUser } from "@/components/user/user-provider";
import { errorCodeOf } from "@/lib/api/errors";
import { cn } from "@/lib/utils";
import { profilesService } from "@/services/profiles.service";

interface ProfileVisibilitySwitchProps {
  onChange?: (isPrivate: boolean) => void;
  /** A labelled switch, or a lock alone, closed while private. */
  variant?: "switch" | "lock";
  className?: string;
}

/**
 * Makes the profile of the current user private or public, once confirmed in
 * a dialog telling what changes. Turning it public accepts the pending follow
 * requests.
 */
export function ProfileVisibilitySwitch({ onChange, variant = "switch", className }: ProfileVisibilitySwitchProps) {
  const t = useTranslations("profile.visibility");
  const tCommon = useTranslations("common");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const user = useCurrentUser();
  const id = useId();
  const [isPrivate, setIsPrivate] = useState(user.profilePrivate);
  const [confirming, setConfirming] = useState(false);
  /** Visibility asked, kept while the dialog closes. */
  const [asked, setAsked] = useState(true);
  const [pending, setPending] = useState(false);

  const confirm = async (next: boolean) => {
    setConfirming(false);
    setIsPrivate(next);
    setPending(true);
    try {
      await profilesService.setPrivacy(next);
      onChange?.(next);
      router.refresh();
    } catch (error) {
      setIsPrivate(!next);
      toast.error(tErrors(errorCodeOf(error)));
    } finally {
      setPending(false);
    }
  };

  const mode = asked ? "private" : "public";
  const ask = (next: boolean) => {
    setAsked(next);
    setConfirming(true);
  };
  return (
    <div className={cn("flex items-center gap-2", className)}>
      {variant === "lock" ? (
        <Button
          variant="ghost"
          size="icon-sm"
          disabled={pending}
          aria-pressed={isPrivate}
          aria-label={t(isPrivate ? "lock.private" : "lock.public")}
          title={t(isPrivate ? "lock.private" : "lock.public")}
          onClick={() => ask(!isPrivate)}
        >
          {isPrivate ? <LockIcon aria-hidden /> : <LockOpenIcon aria-hidden />}
        </Button>
      ) : (
        <>
          <Label htmlFor={id} className="text-sm font-normal text-muted-foreground">
            {t("label")}
          </Label>
          <Switch id={id} size="sm" checked={isPrivate} disabled={pending} onCheckedChange={ask} />
        </>
      )}
      <AlertDialog open={confirming} onOpenChange={setConfirming}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t(`confirm.${mode}.title`)}</AlertDialogTitle>
            <AlertDialogDescription>{t(`confirm.${mode}.description`)}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{tCommon("cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirm(asked)}>
              {t(`confirm.${mode}.action`)}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
