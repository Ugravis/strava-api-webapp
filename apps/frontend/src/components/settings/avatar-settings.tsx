"use client";

import { TrashIcon, UploadIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useRef, useState, type ChangeEvent } from "react";
import { toast } from "sonner";
import { Button } from "@kilotrace/ui/components/button";
import { UserAvatar } from "@/components/user/user-avatar";
import { useCurrentUser } from "@/components/user/user-provider";
import { errorCodeOf } from "@/lib/api/errors";
import { accountService } from "@/services/account.service";
import { SettingsSection } from "./settings-section";

const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp,image/gif";

export function AvatarSettings() {
  const t = useTranslations();
  const router = useRouter();
  const user = useCurrentUser();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  // Provider avatars (e.g. Google) are external URLs and cannot be removed.
  const hasUploadedAvatar = user.avatarUrl?.startsWith("/api/") ?? false;

  async function run(action: () => Promise<unknown>, successKey: string) {
    setBusy(true);
    try {
      await action();
      toast.success(t(successKey));
      router.refresh();
    } catch (error) {
      toast.error(t(`errors.${errorCodeOf(error)}`));
    } finally {
      setBusy(false);
    }
  }

  function onFileSelected(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (file.size > MAX_AVATAR_BYTES) {
      toast.error(t("errors.FILE_TOO_LARGE"));
      return;
    }
    void run(() => accountService.uploadAvatar(file), "settings.avatar.updated");
  }

  return (
    <SettingsSection title={t("settings.avatar.title")} description={t("settings.avatar.description")}>
      <div className="flex flex-col items-center gap-4 sm:flex-row">
        <UserAvatar user={user} className="size-20" fallbackClassName="text-xl" />
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPTED_TYPES}
            className="sr-only"
            tabIndex={-1}
            onChange={onFileSelected}
          />
          <Button onClick={() => inputRef.current?.click()} disabled={busy}>
            <UploadIcon />
            {t("settings.avatar.upload")}
          </Button>
          {hasUploadedAvatar && (
            <Button
              variant="outline"
              disabled={busy}
              onClick={() => void run(accountService.removeAvatar, "settings.avatar.removed")}
            >
              <TrashIcon />
              {t("settings.avatar.remove")}
            </Button>
          )}
        </div>
      </div>
    </SettingsSection>
  );
}
