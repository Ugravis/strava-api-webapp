import type { DistanceBadge } from "@/lib/api/types";
import { BadgeButton } from "./badge-button";

interface BadgeGridProps {
  badges: DistanceBadge[];
  onOpen: (badgeId: string) => void;
}

/** Badges of a family laid out in rows, more of them per row on wider screens. */
export function BadgeGrid({ badges, onOpen }: BadgeGridProps) {
  return (
    <ul className="grid grid-cols-3 gap-x-2 gap-y-4 sm:grid-cols-4 md:grid-cols-6">
      {badges.map((badge, index) => (
        <BadgeButton key={badge.id} badge={badge} index={index} showPin onOpen={onOpen} />
      ))}
    </ul>
  );
}
