import { PaddedFrame } from "@/components/layout/padded-frame";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";

/** Pages laid out with margins, unlike the map which fills the space beside the sidebar. */
export default async function PaddedLayout({ children, params }: LocaleProps & { children: React.ReactNode }) {
  await pageLocale(params);
  return <PaddedFrame>{children}</PaddedFrame>;
}
