import { ContourLines } from "./profile-banner";
import { DEFAULT_PROFILE_COLOR } from "./profile-color";

/**
 * Stands in for the showcase while it is turned off for the whole site: the
 * relief of the banner carried on below, drawn in the hue of the profile and
 * telling nothing of it. The colour is set on the box, so that the card saved
 * as an image keeps it.
 */
export function ProfileRelief({ seed, color }: { seed: string; color: string | null }) {
  return (
    // As tall as the showcase (its widgets and its row of badges), so that the card keeps its size.
    <div className="relative min-h-[282px] flex-1 overflow-hidden border-t" style={{ color: color ?? DEFAULT_PROFILE_COLOR }} aria-hidden>
      <ContourLines seed={`${seed}:relief`} fixedStroke className="opacity-90 mask-t-from-60%" />
    </div>
  );
}
