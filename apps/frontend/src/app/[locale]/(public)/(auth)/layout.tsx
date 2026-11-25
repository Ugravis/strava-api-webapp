import { GridBackdrop } from "@kilotrace/ui/components/layout/grid-backdrop";
import { type LocaleProps, pageLocale } from "@/lib/i18n/page";

export default async function AuthLayout({ children, params }: LocaleProps & { children: React.ReactNode }) {
  await pageLocale(params);
  return (
    <div className="relative isolate flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <GridBackdrop />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
