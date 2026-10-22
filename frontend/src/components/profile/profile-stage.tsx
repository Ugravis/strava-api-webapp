import type { ReactNode } from "react";

/** Width of a profile card: a phone screen, narrower than a phone to let the cards of a deck peek on each side. */
export const CARD_WIDTH = "w-[88%] max-w-sm sm:w-full";

interface ProfileStageProps {
  /** Centered between the top of the page and the card. */
  top: ReactNode;
  /** Centered between the card and the bottom of the page. */
  bottom?: ReactNode;
  children: ReactNode;
}

/** A profile card in the middle of the page, what goes with it above and below. */
export function ProfileStage({ top, bottom, children }: ProfileStageProps) {
  return (
    <div className="flex w-full flex-1 flex-col items-center overflow-x-clip">
      <div className="flex min-h-12 flex-1 items-center justify-center py-2">{top}</div>
      {children}
      <div className="flex min-h-12 w-full flex-1 flex-col items-center justify-center gap-4 py-4">{bottom}</div>
    </div>
  );
}
