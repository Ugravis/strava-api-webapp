import { FloatingPanel } from "@/components/admin/floating-panel";
import { getAdminTranslations } from "@/lib/admin/messages";

/**
 * The panel of a user, opened from a list without leaving it. Kept from one
 * user to the next, so that it stays folded or not.
 */
export default function UserPanelLayout({ children }: { children: React.ReactNode }) {
  const t = getAdminTranslations("common.panel");
  return (
    <FloatingPanel
      title={getAdminTranslations("user")("title")}
      labels={{ panel: t("label"), fold: t("fold"), unfold: t("unfold"), close: t("close") }}
    >
      {children}
    </FloatingPanel>
  );
}
