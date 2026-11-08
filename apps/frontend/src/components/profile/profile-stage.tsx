import type { ReactNode } from "react";
import { DEFAULT_PROFILE_COLOR } from "./profile-color";

/** Width of a profile card: a phone screen, narrower than a phone to let the cards of a deck peek on each side. */
export const CARD_WIDTH = "w-[88%] max-w-sm sm:w-full";

interface ProfileStageProps {
  /** Centered between the top of the page and the card. */
  top: ReactNode;
  /** Centered between the card and the bottom of the page. */
  bottom?: ReactNode;
  /** Hue of the profile shown, faintly tinting the page; null for the default one. */
  color: string | null;
  children: ReactNode;
}

/** A profile card in the middle of the page, what goes with it above and below. */
export function ProfileStage({ top, bottom, color, children }: ProfileStageProps) {
  return (
    <div
      // Over the margins of the page, so that the tint reaches its edges.
      className="-m-4 flex flex-1 flex-col items-center overflow-x-clip p-4 transition-colors duration-500 md:-m-6 md:p-6"
      style={{ backgroundColor: `${color ?? DEFAULT_PROFILE_COLOR}0f` }}
    >
      <div className="flex min-h-12 flex-1 items-center justify-center py-2">{top}</div>
      {children}
      <div className="flex min-h-12 w-full flex-1 flex-col items-center justify-center gap-4 py-4">{bottom}</div>
    </div>
  );
}
