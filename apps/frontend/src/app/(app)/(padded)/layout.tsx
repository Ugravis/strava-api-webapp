import { PaddedFrame } from "@/components/layout/padded-frame";

/** Pages laid out with margins, unlike the map which fills the space beside the sidebar. */
export default function PaddedLayout({ children }: { children: React.ReactNode }) {
  return <PaddedFrame>{children}</PaddedFrame>;
}
