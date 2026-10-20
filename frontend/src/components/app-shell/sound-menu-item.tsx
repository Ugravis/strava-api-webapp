"use client";

import { Volume1Icon, Volume2Icon, VolumeXIcon } from "lucide-react";
import { useTranslations } from "next-intl";
import { useState } from "react";
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

/** Hover before the volume opens, and after leaving it before it closes, in milliseconds. */
const HOVER_OPEN_MS = 150;
const HOVER_CLOSE_MS = 250;

/**
 * Sound of the site, such as the trains of the map: on or off, and its
 * volume, kept by the browser. On a desktop a click turns it on or off and
 * hovering opens the volume slider alone, with its percentage; on a phone,
 * without hover, a tap opens both.
 */
export function SoundMenuItem() {
  const t = useTranslations("sound");
  const { isMobile } = useSidebar();
  const { enabled, volume } = useSoundSettings();
  const percent = Math.round(volume * 100);
  const Icon = !enabled || volume === 0 ? VolumeXIcon : volume < 0.5 ? Volume1Icon : Volume2Icon;
  const label = enabled ? t("on", { percent }) : t("off");
  const [open, setOpen] = useState(false);

  return (
    <SidebarMenuItem>
      <DropdownMenu
        open={open}
        onOpenChange={(next, details) => {
          if (!isMobile && details.reason === "trigger-press") updateSoundSettings({ enabled: !enabled });
          else setOpen(next);
        }}
      >
        <DropdownMenuTrigger
          openOnHover={!isMobile}
          delay={HOVER_OPEN_MS}
          closeDelay={HOVER_CLOSE_MS}
          render={
            // No tooltip: hovering opens the volume, which would show after it.
            <SidebarMenuButton
              aria-label={label}
              className="data-popup-open:bg-sidebar-accent data-popup-open:text-sidebar-accent-foreground"
            />
          }
        >
          <Icon />
          <span>{label}</span>
        </DropdownMenuTrigger>
        <DropdownMenuContent
          className={isMobile ? "min-w-56" : "min-w-40"}
          side={isMobile ? "top" : "right"}
          align="end"
          sideOffset={4}
        >
          {isMobile && (
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
          )}
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
