"use client";

import { Volume1Icon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SidebarMenuButton, SidebarMenuItem, useSidebar } from "@/components/ui/sidebar";
import { Slider } from "@/components/ui/slider";
import { updateSoundSettings, useSoundSettings } from "@/lib/sound/sound-settings";

/** Sound of the site, such as the trains of the map: on or off, and its volume, kept by the browser. */
export function SoundMenuItem() {
  const t = useTranslations("sound");
  const { isMobile } = useSidebar();
  const { enabled, volume } = useSoundSettings();
  const percent = Math.round(volume * 100);
  const Icon = !enabled || volume === 0 ? VolumeXIcon : volume < 0.5 ? Volume1Icon : Volume2Icon;
  const label = enabled ? t("on", { percent }) : t("off");

  return (
    <SidebarMenuItem>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <SidebarMenuButton
              tooltip={label}
              className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
            />
          }
        >
          <Icon />
          <span>{label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-56" side={isMobile ? "top" : "right"} align="end" sideOffset={4}>
          <DropdownMenuGroup>
            <DropdownMenuLabel>{t("title")}</DropdownMenuLabel>
            <DropdownMenuCheckboxItem
              checked={enabled}
              closeOnClick={false}
              onCheckedChange={(checked) => updateSoundSettings({ enabled: checked })}
            >
              {t("enable")}
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
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
        </DropdownMenuContent>
      </DropdownMenu>
    </SidebarMenuItem>
  );
}
