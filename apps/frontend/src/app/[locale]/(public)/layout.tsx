import { PublicFrame } from "@/components/layout/public-frame";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";

export default async function PublicLayout({ children, params }: LocaleProps & { children: React.ReactNode }) {
  await pageLocale(params);
  return <PublicFrame>{children}</PublicFrame>;
}
