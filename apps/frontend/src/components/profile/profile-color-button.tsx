"use client";

import { PaletteIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { errorCodeOf } from "@/lib/api/errors";
import { accountService } from "@/services/account.service";
import { ProfileColorPicker } from "./profile-color-picker";

/** Wait after the last change before saving: the free picker changes on every move. */
const SAVE_DELAY_MS = 500;

interface ProfileColorButtonProps {
  color: string | null;
  /** Called at once on every change, to preview it. */
  onPreview: (color: string | null) => void;
}

/** Changes the hue of the profile of the current user from the profile itself, saved shortly after. */
export function ProfileColorButton({ color, onPreview }: ProfileColorButtonProps) {
  const t = useTranslations("profile.color");
  const tErrors = useTranslations("errors");
  const router = useRouter();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => () => clearTimeout(timer.current), []);

  const change = (next: string | null) => {
    onPreview(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      accountService.updateProfile({ profileColor: next }).then(
        () => router.refresh(),
        (error: unknown) => toast.error(tErrors(errorCodeOf(error))),
      );
    }, SAVE_DELAY_MS);
  };

  return (
    <Popover>
      <PopoverTrigger
        render={<Button variant="ghost" size="icon-sm" aria-label={t("label")} title={t("label")} />}
      >
        <PaletteIcon />
      </PopoverTrigger>
      <PopoverContent className="w-auto max-w-[calc(100vw-2rem)]">
        <p className="text-sm font-medium">{t("label")}</p>
        <ProfileColorPicker value={color} onChange={change} className="max-w-64" />
      </PopoverContent>
    </Popover>
  );
}
