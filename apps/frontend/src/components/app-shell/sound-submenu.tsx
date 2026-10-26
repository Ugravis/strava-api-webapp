"use client";

import { Volume1Icon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenuCheckboxItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@kilotrace/ui/components/dropdown-menu";
import { Slider } from "@/components/ui/slider";
import { updateSoundSettings, useSoundSettings } from "@/lib/sound/sound-settings";

/**
 * Sound of the site, such as the trains of the map, in the account menu:
 * on or off, and its volume, kept by the browser.
 */
export function SoundSubmenu() {
  const t = useTranslations("sound");
  const { enabled, volume } = useSoundSettings();
  const percent = Math.round(volume * 100);
  const Icon = !enabled || volume === 0 ? VolumeXIcon : volume < 0.5 ? Volume1Icon : Volume2Icon;

  return (
    <DropdownMenuSub>
      <DropdownMenuSubTrigger>
        <Icon />
        {enabled ? t("on", { percent }) : t("off")}
      </DropdownMenuSubTrigger>
      <DropdownMenuSubContent className="min-w-56">
        <DropdownMenuCheckboxItem
          checked={enabled}
          closeOnClick={false}
          onCheckedChange={(checked) => updateSoundSettings({ enabled: checked })}
        >
          {t("enable")}
        </DropdownMenuCheckboxItem>
        <div className="flex items-center gap-3 px-1.5 py-2">
          <Slider
            className="flex-1"
            min={0}
            max={100}
            value={[percent]}
            disabled={!enabled}
            thumbLabel={t("volume")}
            onValueChange={(value) => {
              const next = Array.isArray(value) ? value[0] : value;
              updateSoundSettings({ volume: next / 100 });
            }}
          />
          <span className="w-9 text-right text-xs text-muted-foreground tabular-nums">{percent} %</span>
        </div>
      </DropdownMenuSubContent>
    </DropdownMenuSub>
  );
}
