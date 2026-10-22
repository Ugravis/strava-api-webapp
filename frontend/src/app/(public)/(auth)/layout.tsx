import { GridBackdrop } from "@/components/layout/grid-backdrop";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative isolate flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <GridBackdrop />
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
