export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-start justify-center px-4 py-8 sm:items-center sm:py-12">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
